/**
 * @fileoverview x402 Protocol Type Definitions
 * @description Complete type definitions for the x402 payment protocol
 * @see https://build.avax.network/academy/blockchain/x402-payment-infrastructure
 */

import type { NETWORKS, PAYMENT_SCHEMES } from '../constants/index.js';

// =============================================================================
// BASIC TYPES
// =============================================================================

/**
 * Payment scheme type
 * - "exact": Uses EIP-3009 transferWithAuthorization (exact amount authorization)
 */
export type PaymentScheme = typeof PAYMENT_SCHEMES[keyof typeof PAYMENT_SCHEMES];

/**
 * Supported blockchain network identifiers
 */
export type NetworkId = typeof NETWORKS[keyof typeof NETWORKS];

// =============================================================================
// PAYMENT REQUIREMENTS (Server → Client)
// =============================================================================

/**
 * Single payment option that a merchant accepts
 * 
 * When merchant returns 402 response, it includes one or more of these options.
 * Client can choose any one to complete payment.
 */
export interface PaymentRequirement {
  /** Payment scheme, currently "exact" */
  scheme: PaymentScheme;
  
  /** Blockchain network, e.g., "avalanche-fuji" */
  network: NetworkId;
  
  /** 
   * Maximum payment amount in base units (smallest denomination)
   * For USDC (6 decimals): "10000" = 0.01 USDC
   */
  maxAmountRequired: string;
  
  /** Requested resource path, e.g., "/api/buy-jeans" */
  resource: string;
  
  /** Human-readable payment description */
  description: string;
  
  /** Merchant wallet address - where funds will be sent */
  payTo: string;
  
  /** Token contract address, e.g., USDC contract */
  asset: string;
  
  /** Payment timeout in seconds */
  maxTimeoutSeconds: number;
  
  /** Optional: Additional product/order information */
  extra?: {
    productId?: string;
    productName?: string;
    orderId?: string;
    authorAddress?: string;
    [key: string]: unknown;
  };
}

/**
 * 402 Payment Required response body
 * Merchant returns this when payment is needed
 */
export interface PaymentRequiredResponse {
  /** x402 protocol version */
  x402Version: number;
  
  /** List of accepted payment options */
  accepts: PaymentRequirement[];
  
  /** Error message for the client */
  error: string;
}

// =============================================================================
// PAYMENT PAYLOAD (Client → Server)
// =============================================================================

/**
 * EIP-3009 Authorization Data
 * 
 * This is the "gasless transfer" standard used by USDC and other tokens.
 * User signs authorization, then anyone can submit the transaction on-chain.
 */
export interface EIP3009Authorization {
  /** Payer wallet address */
  from: string;
  
  /** Recipient wallet address (merchant) */
  to: string;
  
  /** Transfer amount in base units (string) */
  value: string;
  
  /** Authorization valid after this Unix timestamp */
  validAfter: string;
  
  /** Authorization expires at this Unix timestamp */
  validBefore: string;
  
  /** Unique nonce to prevent replay attacks */
  nonce: string;
}

/**
 * Payment payload containing signature and authorization
 * Client sends this in X-PAYMENT header (Base64 encoded)
 */
export interface PaymentPayload {
  /** x402 protocol version */
  x402Version: number;
  
  /** Payment scheme used */
  scheme: PaymentScheme;
  
  /** Blockchain network */
  network: NetworkId;
  
  /** Payload data */
  payload: {
    /** EIP-712 typed data signature */
    signature: string;
    
    /** EIP-3009 authorization data */
    authorization: EIP3009Authorization;
  };
}

// =============================================================================
// PAYMENT RESPONSE (Server → Client)
// =============================================================================

/**
 * X-PAYMENT-RESPONSE header content (decoded)
 * Server returns this after processing payment
 */
export interface PaymentResponse {
  /** Whether payment was successful */
  success: boolean;
  
  /** Blockchain transaction hash (null if failed) */
  transaction: string | null;
  
  /** Network where transaction was submitted */
  network: NetworkId;
  
  /** Payer wallet address */
  payer: string | null;
  
  /** Error reason if payment failed */
  errorReason: string | null;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Result of payment payload validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Error message if validation failed */
  error?: string;
}

// =============================================================================
// PRODUCT TYPES
// =============================================================================

/**
 * Product information
 */
export interface Product {
  /** Unique product identifier */
  id: string;
  
  /** Product display name */
  name: string;
  
  /** Product description */
  description: string;
  
  /** Price in USD (human-readable, e.g., 50.00) */
  priceUSD: number;
  
  /** Price in base units (e.g., "50000000" for 50 USDC) */
  priceInBaseUnits: string;

  /** Author wallet address to receive settlement in vault */
  authorAddress: string;
}

/**
 * Purchase receipt returned after successful payment
 */
export interface PurchaseReceipt {
  /** Product ID */
  productId: string;
  
  /** Product name */
  productName: string;
  
  /** Amount paid in USD */
  amount: number;
  
  /** Currency used */
  currency: string;
  
  /** Payer wallet address */
  payer: string;
  
  /** Purchase timestamp (ISO 8601) */
  timestamp: string;
  
  /** Blockchain transaction hash */
  transactionHash: string | null;
}

