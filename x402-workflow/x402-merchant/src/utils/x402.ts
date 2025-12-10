/**
 * x402 Protocol Utilities
 */

import type { PaymentRequirement, PaymentRequiredResponse, PaymentPayload, PaymentResponse, ValidationResult, NetworkId } from '../types/index.js';
import { config } from '../config/index.js';
import { X402_VERSION, PAYMENT_SCHEMES, DEFAULT_PAYMENT_TIMEOUT_SECONDS, NETWORKS } from '../constants/index.js';

/** Build 402 Payment Required response */
export function buildPaymentRequired(
  resource: string,
  amountInBaseUnits: string,
  description: string,
  extra?: Record<string, unknown>
): PaymentRequiredResponse {
  const paymentRequirement: PaymentRequirement = {
    scheme: PAYMENT_SCHEMES.EXACT,
    network: config.merchant.network as NetworkId,
    maxAmountRequired: amountInBaseUnits,
    resource,
    description,
    payTo: config.merchant.facilitatorAddress,
    asset: config.merchant.acceptedToken,
    maxTimeoutSeconds: DEFAULT_PAYMENT_TIMEOUT_SECONDS,
    extra,
  };

  return {
    x402Version: X402_VERSION,
    accepts: [paymentRequirement],
    error: 'X-PAYMENT header is required',
  };
}

/** Decode X-PAYMENT header from Base64 */
export function decodePaymentHeader(headerValue: string): PaymentPayload | null {
  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded) as PaymentPayload;
    if (!payload.x402Version || !payload.scheme || !payload.payload) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Encode payment payload to Base64 */
export function encodePaymentHeader(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/** Encode payment response to Base64 */
export function encodePaymentResponse(response: PaymentResponse): string {
  return Buffer.from(JSON.stringify(response)).toString('base64');
}

/** Decode X-PAYMENT-RESPONSE header from Base64 */
export function decodePaymentResponse(headerValue: string): PaymentResponse | null {
  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(decoded) as PaymentResponse;
  } catch {
    return null;
  }
}

/** Validate payment payload structure */
export function validatePaymentPayload(payload: PaymentPayload): ValidationResult {
  if (payload.x402Version !== X402_VERSION) {
    return { valid: false, error: `Unsupported x402 version: ${payload.x402Version}` };
  }

  if (payload.scheme !== PAYMENT_SCHEMES.EXACT) {
    return { valid: false, error: `Unsupported scheme: ${payload.scheme}` };
  }

  const supportedNetworks = Object.values(NETWORKS);
  if (!supportedNetworks.includes(payload.network as typeof NETWORKS[keyof typeof NETWORKS])) {
    return { valid: false, error: `Unsupported network: ${payload.network}` };
  }

  const auth = payload.payload?.authorization;
  if (!auth) return { valid: false, error: 'Missing authorization' };

  const requiredFields = ['from', 'to', 'value', 'validAfter', 'validBefore', 'nonce'];
  for (const field of requiredFields) {
    if (!auth[field as keyof typeof auth]) {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }

  if (auth.to.toLowerCase() !== config.merchant.facilitatorAddress.toLowerCase()) {
    return { valid: false, error: 'Recipient mismatch' };
  }

  if (!payload.payload?.signature) return { valid: false, error: 'Missing signature' };

  const now = Math.floor(Date.now() / 1000);
  const validAfter = parseInt(auth.validAfter, 10);
  const validBefore = parseInt(auth.validBefore, 10);

  if (now < validAfter) return { valid: false, error: 'Not yet valid' };
  if (now > validBefore) return { valid: false, error: 'Expired' };

  return { valid: true };
}

/** Validate payment amount */
export function validatePaymentAmount(paidAmount: string, requiredAmount: string): ValidationResult {
  if (BigInt(paidAmount) < BigInt(requiredAmount)) {
    return { valid: false, error: `Insufficient: ${paidAmount} < ${requiredAmount}` };
  }
  return { valid: true };
}

