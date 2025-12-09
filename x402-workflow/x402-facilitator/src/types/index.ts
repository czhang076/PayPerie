/**
 * Facilitator Type Definitions
 */

// =============================================================================
// USER POLICY TYPES
// =============================================================================

/**
 * User's spending policy and authorization settings
 */
export interface UserPolicy {
  /** User's wallet address */
  userAddress: `0x${string}`;
  
  /** Maximum amount per transaction (in base units) */
  maxTransactionAmount: bigint;
  
  /** Daily spending limit (in base units) */
  dailySpendingLimit: bigint;
  
  /** Amount spent today */
  spentToday: bigint;
  
  /** Timestamp of last spending reset */
  lastResetTimestamp: number;
  
  /** List of authorized merchant addresses */
  authorizedMerchants: `0x${string}`[];
  
  /** List of authorized merchant domains */
  authorizedDomains: string[];
  
  /** Whether automatic payments are enabled */
  autoPayEnabled: boolean;
  
  /** User's funded balance held by facilitator (optional) */
  fundedBalance?: bigint;
}

/**
 * Merchant whitelist entry
 */
export interface MerchantInfo {
  /** Merchant wallet address */
  address: `0x${string}`;
  
  /** Merchant name */
  name: string;
  
  /** Merchant domain */
  domain: string;
  
  /** Whether merchant is verified */
  verified: boolean;
  
  /** Maximum transaction amount for this merchant */
  maxTransactionLimit?: bigint;
  
  /** Merchant category */
  category?: string;
}

// =============================================================================
// PAYMENT REQUEST TYPES
// =============================================================================

/**
 * Payment execution request from AI Agent
 */
export interface PaymentRequest {
  /** User's wallet address */
  userAddress: `0x${string}`;
  
  /** 402 Challenge from merchant */
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
  
  /** Signed payment payload from user */
  signedPayload: {
    signature: `0x${string}`;
    authorization: {
      from: `0x${string}`;
      to: `0x${string}`;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: `0x${string}`;
    };
  };
}

/**
 * Payment execution result
 */
export interface PaymentResult {
  /** Whether payment was successful */
  success: boolean;
  
  /** Transaction hash if successful */
  transactionHash?: `0x${string}`;
  
  /** Error message if failed */
  error?: string;
  
  /** Error code for programmatic handling */
  errorCode?: 'UNAUTHORIZED_MERCHANT' | 'EXCEEDS_LIMIT' | 'INSUFFICIENT_BALANCE' | 
              'INVALID_SIGNATURE' | 'EXPIRED' | 'TRANSACTION_FAILED' | 'POLICY_VIOLATION';
  
  /** Additional details */
  details?: {
    from: `0x${string}`;
    to: `0x${string}`;
    amount: string;
    network: string;
  };
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  remainingDaily?: bigint;
  maxAllowed?: bigint;
}
