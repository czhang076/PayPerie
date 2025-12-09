/**
 * x402 Client Type Definitions
 * 
 * Types for parsing 402 responses and building payment authorizations.
 */

// =============================================================================
// 402 RESPONSE TYPES (from Merchant)
// =============================================================================

/**
 * A single payment option from the merchant's 402 response
 */
export interface PaymentRequirement {
  /** Payment scheme (e.g., "exact") */
  scheme: string;
  /** Network identifier (e.g., "avalanche-fuji") */
  network: string;
  /** Maximum amount required in base units (string for large numbers) */
  maxAmountRequired: string;
  /** The resource being purchased */
  resource: string;
  /** Human-readable description */
  description: string;
  /** Merchant's receiving address */
  payTo: `0x${string}`;
  /** Token contract address (e.g., USDC) */
  asset: `0x${string}`;
  /** Maximum time to complete payment (seconds) */
  maxTimeoutSeconds: number;
  /** Additional merchant-specific data */
  extra?: Record<string, unknown>;
}

/**
 * Full 402 Payment Required response from merchant
 */
export interface PaymentRequiredResponse {
  /** x402 protocol version */
  x402Version: number;
  /** Array of accepted payment methods */
  accepts: PaymentRequirement[];
  /** Error message if any */
  error?: string;
}

// =============================================================================
// PAYMENT AUTHORIZATION TYPES (to Merchant)
// =============================================================================

/**
 * EIP-3009 TransferWithAuthorization parameters
 */
export interface EIP3009Authorization {
  /** Payer's address (must match signer) */
  from: `0x${string}`;
  /** Recipient's address (merchant's payTo) */
  to: `0x${string}`;
  /** Amount in base units */
  value: bigint;
  /** Unix timestamp: authorization valid after */
  validAfter: bigint;
  /** Unix timestamp: authorization valid before */
  validBefore: bigint;
  /** Unique nonce (random bytes32) */
  nonce: `0x${string}`;
}

/**
 * Signed payment payload to send in X-PAYMENT header
 */
export interface PaymentPayload {
  /** x402 protocol version */
  x402Version: number;
  /** Payment scheme used */
  scheme: string;
  /** Network identifier */
  network: string;
  /** The EIP-3009 authorization payload */
  payload: {
    /** Signature components */
    signature: `0x${string}`;
    /** Authorization details */
    authorization: {
      from: `0x${string}`;
      to: `0x${string}`;
      value: string; // String for JSON serialization
      validAfter: string;
      validBefore: string;
      nonce: `0x${string}`;
    };
  };
}

// =============================================================================
// CLIENT TYPES
// =============================================================================

/**
 * Configuration for the x402 client
 */
export interface ClientConfig {
  /** Merchant server base URL */
  merchantUrl: string;
  /** Private key for signing (hex string with 0x prefix) */
  privateKey: `0x${string}`;
}

/**
 * Result of a purchase attempt
 */
export interface PurchaseResult {
  /** Whether the purchase was successful */
  success: boolean;
  /** HTTP status code */
  statusCode: number;
  /** Response data (product data on success, error on failure) */
  data: unknown;
  /** Payment receipt if successful */
  receipt?: PaymentReceipt;
}

/**
 * Payment receipt returned by merchant after successful payment
 */
export interface PaymentReceipt {
  success: boolean;
  receipt: {
    transactionHash: string;
    from: string;
    to: string;
    amount: string;
    timestamp: number;
  };
  product: {
    id: string;
    name: string;
    downloadUrl: string;
    expiresAt: string;
  };
}
