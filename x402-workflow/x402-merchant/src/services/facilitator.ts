/**
 * Payment Facilitator Service
 * 
 * Handles the verification and execution of x402 payments:
 * 1. Verifies EIP-712 signatures
 * 2. Checks USDC balance and allowance
 * 3. Executes transferWithAuthorization on-chain
 * 4. Returns transaction receipt
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  verifyTypedData,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { USDC_ADDRESSES, CHAIN_IDS, NETWORKS } from '../constants/index.js';
import type { PaymentPayload } from '../types/x402.js';

// =============================================================================
// USDC CONTRACT ABI (only the functions we need)
// =============================================================================

const USDC_ABI = [
  // Read functions
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // EIP-3009: transferWithAuthorization
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  // EIP-3009: Check if authorization nonce is used
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// =============================================================================
// EIP-712 DOMAIN AND TYPES
// =============================================================================

const getEIP712Domain = (chainId: number, usdcAddress: Address) => ({
  name: 'USD Coin',
  version: '2',
  chainId: BigInt(chainId),
  verifyingContract: usdcAddress,
});

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

// =============================================================================
// FACILITATOR RESULT TYPES
// =============================================================================

export interface FacilitatorResult {
  success: boolean;
  transactionHash?: Hex;
  error?: string;
  details?: {
    from: Address;
    to: Address;
    amount: string;
    network: string;
  };
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  recoveredAddress?: Address;
}

// =============================================================================
// FACILITATOR CLASS
// =============================================================================

export class PaymentFacilitator {
  private publicClient;
  private walletClient;
  private usdcAddress: Address;
  private chainId: number;

  constructor(privateKey: Hex, network: string = NETWORKS.AVALANCHE_FUJI) {
    // Type-safe network lookup with fallback
    const networkKey = network as keyof typeof CHAIN_IDS;
    this.chainId = CHAIN_IDS[networkKey] ?? CHAIN_IDS[NETWORKS.AVALANCHE_FUJI];
    this.usdcAddress = (USDC_ADDRESSES[networkKey] ?? USDC_ADDRESSES[NETWORKS.AVALANCHE_FUJI]) as Address;

    // Create public client for reading blockchain state
    this.publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(),
    });

    // Create wallet client for sending transactions
    const account = privateKeyToAccount(privateKey);
    this.walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(),
    });

    console.log(`[Facilitator] Initialized for ${network}`);
    console.log(`[Facilitator] USDC Address: ${this.usdcAddress}`);
    console.log(`[Facilitator] Executor: ${account.address}`);
  }

  /**
   * Verify EIP-712 signature from payment payload
   */
  async verifySignature(payload: PaymentPayload): Promise<VerificationResult> {
    try {
      const { authorization, signature } = payload.payload;
      
      const message = {
        from: authorization.from as Address,
        to: authorization.to as Address,
        value: BigInt(authorization.value),
        validAfter: BigInt(authorization.validAfter),
        validBefore: BigInt(authorization.validBefore),
        nonce: authorization.nonce as Hex,
      };

      const domain = getEIP712Domain(this.chainId, this.usdcAddress);

      const valid = await verifyTypedData({
        address: authorization.from as Address,
        domain,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: 'TransferWithAuthorization',
        message,
        signature: signature as Hex,
      });

      if (!valid) {
        return { valid: false, error: 'Signature verification failed' };
      }

      return { valid: true, recoveredAddress: authorization.from as Address };
    } catch (error) {
      return { 
        valid: false, 
        error: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if payer has sufficient USDC balance
   */
  async checkBalance(payer: Address, amount: bigint): Promise<{ sufficient: boolean; balance: bigint }> {
    const balance = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [payer],
    });

    return {
      sufficient: balance >= amount,
      balance,
    };
  }

  /**
   * Check if authorization nonce has already been used
   */
  async isNonceUsed(authorizer: Address, nonce: Hex): Promise<boolean> {
    try {
      const used = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'authorizationState',
        args: [authorizer, nonce],
      });
      return used;
    } catch {
      // If the function doesn't exist, assume nonce is not used
      return false;
    }
  }

  /**
   * Execute the payment on-chain using transferWithAuthorization
   */
  async executePayment(payload: PaymentPayload): Promise<FacilitatorResult> {
    const { authorization, signature } = payload.payload;
    
    console.log('\n[Facilitator] 🔄 Processing payment...');
    console.log(`[Facilitator]    From: ${authorization.from}`);
    console.log(`[Facilitator]    To: ${authorization.to}`);
    console.log(`[Facilitator]    Amount: ${authorization.value} (${Number(authorization.value) / 1_000_000} USDC)`);

    // Step 1: Verify signature
    console.log('[Facilitator] 🔐 Verifying signature...');
    const verification = await this.verifySignature(payload);
    if (!verification.valid) {
      console.log(`[Facilitator] ❌ Signature invalid: ${verification.error}`);
      return { success: false, error: verification.error };
    }
    console.log('[Facilitator] ✅ Signature verified');

    // Step 2: Check validity window
    const now = BigInt(Math.floor(Date.now() / 1000));
    const validAfter = BigInt(authorization.validAfter);
    const validBefore = BigInt(authorization.validBefore);
    
    if (now < validAfter) {
      return { success: false, error: `Authorization not yet valid. Valid after: ${validAfter}` };
    }
    if (now > validBefore) {
      return { success: false, error: `Authorization expired. Valid before: ${validBefore}` };
    }
    console.log('[Facilitator] ✅ Validity window OK');

    // Step 3: Check balance
    console.log('[Facilitator] 💰 Checking balance...');
    const amount = BigInt(authorization.value);
    const balanceCheck = await this.checkBalance(authorization.from as Address, amount);
    if (!balanceCheck.sufficient) {
      console.log(`[Facilitator] ❌ Insufficient balance: ${balanceCheck.balance} < ${amount}`);
      return { 
        success: false, 
        error: `Insufficient USDC balance. Required: ${amount}, Available: ${balanceCheck.balance}` 
      };
    }
    console.log(`[Facilitator] ✅ Balance sufficient: ${balanceCheck.balance}`);

    // Step 4: Check nonce
    console.log('[Facilitator] 🔢 Checking nonce...');
    const nonceUsed = await this.isNonceUsed(
      authorization.from as Address, 
      authorization.nonce as Hex
    );
    if (nonceUsed) {
      return { success: false, error: 'Authorization nonce already used' };
    }
    console.log('[Facilitator] ✅ Nonce available');

    // Step 5: Split signature into v, r, s
    const sig = signature as Hex;
    const r = `0x${sig.slice(2, 66)}` as Hex;
    const s = `0x${sig.slice(66, 130)}` as Hex;
    const v = parseInt(sig.slice(130, 132), 16);

    // Step 6: Execute transferWithAuthorization
    console.log('[Facilitator] 📤 Submitting transaction...');
    try {
      const hash = await this.walletClient.writeContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          authorization.from as Address,
          authorization.to as Address,
          amount,
          validAfter,
          validBefore,
          authorization.nonce as Hex,
          v,
          r,
          s,
        ],
      });

      console.log(`[Facilitator] ✅ Transaction submitted: ${hash}`);

      // Wait for confirmation
      console.log('[Facilitator] ⏳ Waiting for confirmation...');
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log(`[Facilitator] ✅ Transaction confirmed in block ${receipt.blockNumber}`);
        return {
          success: true,
          transactionHash: hash,
          details: {
            from: authorization.from as Address,
            to: authorization.to as Address,
            amount: authorization.value,
            network: payload.network,
          },
        };
      } else {
        console.log('[Facilitator] ❌ Transaction reverted');
        return { success: false, error: 'Transaction reverted', transactionHash: hash };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Facilitator] ❌ Transaction failed: ${errorMessage}`);
      return { success: false, error: `Transaction failed: ${errorMessage}` };
    }
  }

  /**
   * Get USDC balance for an address
   */
  async getUSDCBalance(address: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.usdcAddress,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let facilitatorInstance: PaymentFacilitator | null = null;

/**
 * Get or create the Payment Facilitator instance
 */
export function getFacilitator(privateKey?: Hex): PaymentFacilitator {
  if (!facilitatorInstance) {
    if (!privateKey) {
      throw new Error('Private key required to initialize Facilitator');
    }
    facilitatorInstance = new PaymentFacilitator(privateKey);
  }
  return facilitatorInstance;
}
