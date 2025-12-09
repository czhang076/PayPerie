/**
 * x402 Payment Signer
 * 
 * Creates EIP-712 signed payment authorizations for x402 protocol.
 * Uses EIP-3009 TransferWithAuthorization for gasless USDC transfers.
 */

import { privateKeyToAccount, signTypedData } from 'viem/accounts';
import { 
  CHAIN_IDS, 
  USDC_ADDRESSES, 
  getEIP712Domain, 
  TRANSFER_WITH_AUTHORIZATION_TYPES 
} from '../constants/index.js';
import type { 
  PaymentRequirement, 
  PaymentPayload, 
  EIP3009Authorization 
} from '../types/index.js';

/**
 * Generate a random bytes32 nonce for the authorization
 */
function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

/**
 * Create a signed payment authorization for a 402 payment requirement
 * 
 * @param privateKey - The payer's private key
 * @param requirement - The payment requirement from the 402 response
 * @returns The signed payment payload for the X-PAYMENT header
 */
export async function createPaymentAuthorization(
  privateKey: `0x${string}`,
  requirement: PaymentRequirement
): Promise<PaymentPayload> {
  // Get account from private key
  const account = privateKeyToAccount(privateKey);
  
  // Get chain configuration
  const chainId = CHAIN_IDS[requirement.network];
  if (!chainId) {
    throw new Error(`Unsupported network: ${requirement.network}`);
  }
  
  const usdcAddress = USDC_ADDRESSES[requirement.network];
  if (!usdcAddress) {
    throw new Error(`No USDC address for network: ${requirement.network}`);
  }

  // Calculate validity window
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 60); // Valid from 1 minute ago (clock skew tolerance)
  const validBefore = BigInt(now + requirement.maxTimeoutSeconds);

  // Generate unique nonce
  const nonce = generateNonce();

  // Build the authorization
  const authorization: EIP3009Authorization = {
    from: account.address,
    to: requirement.payTo,
    value: BigInt(requirement.maxAmountRequired),
    validAfter,
    validBefore,
    nonce,
  };

  // Sign the authorization using EIP-712
  const domain = getEIP712Domain(chainId, usdcAddress);
  
  const signature = await signTypedData({
    privateKey,
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    },
  });

  // Build the payment payload
  const paymentPayload: PaymentPayload = {
    x402Version: 1,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: {
      signature,
      authorization: {
        from: authorization.from,
        to: authorization.to,
        value: authorization.value.toString(),
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
        nonce: authorization.nonce,
      },
    },
  };

  return paymentPayload;
}

/**
 * Encode a payment payload for the X-PAYMENT header
 * Uses Base64 encoding of the JSON payload
 */
export function encodePaymentHeader(payload: PaymentPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64');
}

/**
 * Get the signer address from a private key
 */
export function getSignerAddress(privateKey: `0x${string}`): `0x${string}` {
  return privateKeyToAccount(privateKey).address;
}
