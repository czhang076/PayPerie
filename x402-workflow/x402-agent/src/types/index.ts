/**
 * Agent Types
 */

export interface PaymentChallenge {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: `0x${string}`;
  asset: `0x${string}`;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentChallenge[];
  error?: string;
}

export interface SignedPayload {
  signature: `0x${string}`;
  authorization: {
    from: `0x${string}`;
    to: `0x${string}`;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: `0x${string}`;
  };
}

export interface FacilitatorRequest {
  userAddress: `0x${string}`;
  challenge: {
    merchantAddress: `0x${string}`;
    merchantDomain?: string;
    amount: string;
    asset: `0x${string}`;
    network: string;
    resource: string;
    description: string;
    timeoutSeconds: number;
  };
  signedPayload: SignedPayload;
}

export interface FacilitatorResponse {
  success: boolean;
  transactionHash?: `0x${string}`;
  error?: string;
  errorCode?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  priceInBaseUnits: string;
}

export interface PurchaseResult {
  success: boolean;
  message?: string;
  transactionHash?: string;
  product?: Product;
  error?: string;
}

// Tool definitions for Claude
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
