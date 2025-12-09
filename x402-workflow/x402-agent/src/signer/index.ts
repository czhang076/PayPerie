/**
 * Payment Signer
 * 
 * Creates EIP-712 signed payment authorizations.
 */

import { privateKeyToAccount, signTypedData } from 'viem/accounts';
import {
  CHAIN_IDS,
  USDC_ADDRESSES,
  NETWORKS,
  getEIP712Domain,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
} from '../constants/index.js';
import type { PaymentChallenge, SignedPayload } from '../types/index.js';

/**
 * Generate random bytes32 nonce
 */
function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

/**
 * Create signed payment authorization
 */
export async function signPayment(
  privateKey: `0x${string}`,
  challenge: PaymentChallenge
): Promise<SignedPayload> {
  const account = privateKeyToAccount(privateKey);
  
  const chainId = CHAIN_IDS[challenge.network] || CHAIN_IDS[NETWORKS.AVALANCHE_FUJI];
  const usdcAddress = USDC_ADDRESSES[challenge.network] || USDC_ADDRESSES[NETWORKS.AVALANCHE_FUJI];

  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 60);
  const validBefore = BigInt(now + challenge.maxTimeoutSeconds);
  const nonce = generateNonce();

  const authorization = {
    from: account.address,
    to: challenge.payTo,
    value: BigInt(challenge.maxAmountRequired),
    validAfter,
    validBefore,
    nonce,
  };

  const domain = getEIP712Domain(chainId, usdcAddress);

  const signature = await signTypedData({
    privateKey,
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });

  return {
    signature,
    authorization: {
      from: account.address,
      to: challenge.payTo,
      value: authorization.value.toString(),
      validAfter: authorization.validAfter.toString(),
      validBefore: authorization.validBefore.toString(),
      nonce: authorization.nonce,
    },
  };
}

/**
 * Get wallet address from private key
 */
export function getWalletAddress(privateKey: `0x${string}`): `0x${string}` {
  return privateKeyToAccount(privateKey).address;
}
