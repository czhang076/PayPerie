/**
 * Payment Executor - on-chain execution using EIP-3009 transferWithAuthorization
 */

import { createPublicClient, createWalletClient, http, verifyTypedData, type Hex, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { USDC_ADDRESSES, NETWORKS, CHAIN_IDS } from '../constants/index.js';
import { config } from '../config/index.js';
import type { PaymentRequest, PaymentResult } from '../types/index.js';

const USDC_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transferWithAuthorization', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }
    ], outputs: [] },
  { name: 'authorizationState', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'authorizer', type: 'address' }, { name: 'nonce', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

const VAULT_ABI = [
  {
    name: 'settlePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'author', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const getEIP712Domain = (chainId: number, usdcAddress: Address) => ({
  name: 'USD Coin', version: '2', chainId: BigInt(chainId), verifyingContract: usdcAddress
});

const TRANSFER_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }
  ]
} as const;

export class PaymentExecutor {
  private publicClient;
  private walletClient;
  private usdcAddress: Address;
  private chainId: number;
  private vaultAddress: Address;
  private facilitatorAddress: Address;

  constructor() {
    this.chainId = CHAIN_IDS[NETWORKS.AVALANCHE_FUJI];
    this.usdcAddress = USDC_ADDRESSES[NETWORKS.AVALANCHE_FUJI];
    this.vaultAddress = config.contracts.vaultAddress;
    this.publicClient = createPublicClient({ chain: avalancheFuji, transport: http(config.rpc.url) });
    const account = privateKeyToAccount(config.facilitator.privateKey);
    this.walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http(config.rpc.url) });
    this.facilitatorAddress = account.address;
    console.log(`[Executor] Account: ${account.address}`);
  }

  async verifySignature(request: PaymentRequest): Promise<boolean> {
    try {
      const { authorization, signature } = request.signedPayload;
      const message = {
        from: authorization.from, to: authorization.to, value: BigInt(authorization.value),
        validAfter: BigInt(authorization.validAfter), validBefore: BigInt(authorization.validBefore), nonce: authorization.nonce
      };
      return await verifyTypedData({
        address: authorization.from,
        domain: getEIP712Domain(this.chainId, this.usdcAddress),
        types: TRANSFER_AUTH_TYPES,
        primaryType: 'TransferWithAuthorization',
        message, signature
      });
    } catch { return false; }
  }

  async checkBalance(address: Address): Promise<bigint> {
    return this.publicClient.readContract({ address: this.usdcAddress, abi: USDC_ABI, functionName: 'balanceOf', args: [address] });
  }

  async isNonceUsed(authorizer: Address, nonce: Hex): Promise<boolean> {
    try {
      return await this.publicClient.readContract({ address: this.usdcAddress, abi: USDC_ABI, functionName: 'authorizationState', args: [authorizer, nonce] });
    } catch { return false; }
  }

  async executePayment(request: PaymentRequest): Promise<PaymentResult> {
    const { authorization, signature } = request.signedPayload;
    const amount = BigInt(authorization.value);
    console.log(`[Executor] From: ${authorization.from}, Amount: ${Number(amount) / 1e6} USDC`);

    // Verify signature
    if (!await this.verifySignature(request)) {
      return { success: false, error: 'Invalid signature', errorCode: 'INVALID_SIGNATURE' };
    }

    // Check validity window
    const now = BigInt(Math.floor(Date.now() / 1000));
    const validAfter = BigInt(authorization.validAfter);
    const validBefore = BigInt(authorization.validBefore);
    if (now < validAfter || now > validBefore) {
      return { success: false, error: 'Authorization expired', errorCode: 'EXPIRED' };
    }

    // Check balance
    const balance = await this.checkBalance(authorization.from);
    if (balance < amount) {
      return { success: false, error: `Insufficient balance: ${balance} < ${amount}`, errorCode: 'INSUFFICIENT_BALANCE' };
    }

    // Check nonce
    if (await this.isNonceUsed(authorization.from, authorization.nonce)) {
      return { success: false, error: 'Nonce already used', errorCode: 'TRANSACTION_FAILED' };
    }

    // Split signature
    const r = `0x${signature.slice(2, 66)}` as Hex;
    const s = `0x${signature.slice(66, 130)}` as Hex;
    const v = parseInt(signature.slice(130, 132), 16);

    try {
      // Step 1: Collect funds to facilitator via transferWithAuthorization
      const collectHash = await this.walletClient.writeContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'transferWithAuthorization',
        args: [authorization.from, authorization.to, amount, validAfter, validBefore, authorization.nonce, v, r, s],
      });
      console.log(`[Executor] Collect TX submitted: ${collectHash}`);
      const collectReceipt = await this.publicClient.waitForTransactionReceipt({ hash: collectHash });
      if (collectReceipt.status !== 'success') {
        return { success: false, error: 'Collect transaction reverted', errorCode: 'TRANSACTION_FAILED', transactionHash: collectHash };
      }

      // Step 2: Approve vault if needed
      const currentAllowance: bigint = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [this.facilitatorAddress, this.vaultAddress],
      });

      const needsApproval = currentAllowance < amount;
      if (needsApproval) {
        const approveHash = await this.walletClient.writeContract({
          address: this.usdcAddress,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [this.vaultAddress, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
        });
        console.log(`[Executor] Approve TX submitted: ${approveHash}`);
        const approveReceipt = await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== 'success') {
          return { success: false, error: 'Approve transaction reverted', errorCode: 'TRANSACTION_FAILED', transactionHash: approveHash };
        }
      }

      // Step 3: Settle to vault using authorAddress from challenge
      const authorAddress = request.challenge.extra?.authorAddress;
      if (!authorAddress) {
        return { success: false, error: 'Missing author address', errorCode: 'TRANSACTION_FAILED' };
      }

      const settleHash = await this.walletClient.writeContract({
        address: this.vaultAddress,
        abi: VAULT_ABI,
        functionName: 'settlePayment',
        args: [authorAddress, amount],
      });
      console.log(`[Executor] Settle TX submitted: ${settleHash}`);
      const settleReceipt = await this.publicClient.waitForTransactionReceipt({ hash: settleHash });
      if (settleReceipt.status !== 'success') {
        return { success: false, error: 'Settlement reverted', errorCode: 'TRANSACTION_FAILED', transactionHash: settleHash };
      }

      return {
        success: true,
        transactionHash: settleHash,
        details: { from: authorization.from, to: this.vaultAddress, amount: authorization.value, network: NETWORKS.AVALANCHE_FUJI },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Executor] Failed: ${msg}`);
      return { success: false, error: msg, errorCode: 'TRANSACTION_FAILED' };
    }
  }
}

let executorInstance: PaymentExecutor | null = null;
export function getExecutor(): PaymentExecutor {
  if (!executorInstance) executorInstance = new PaymentExecutor();
  return executorInstance;
}
