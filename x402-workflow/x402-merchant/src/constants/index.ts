/**
 * @fileoverview Application Constants
 * @description Centralized constants for the x402 merchant server
 */

// =============================================================================
// BLOCKCHAIN CONSTANTS
// =============================================================================

/**
 * Supported blockchain networks
 */
export const NETWORKS = {
  AVALANCHE_FUJI: 'avalanche-fuji',
  AVALANCHE_MAINNET: 'avalanche-mainnet',
  BASE_SEPOLIA: 'base-sepolia',
  BASE_MAINNET: 'base-mainnet',
} as const;

/**
 * Chain IDs for supported networks
 */
export const CHAIN_IDS = {
  [NETWORKS.AVALANCHE_FUJI]: 43113,
  [NETWORKS.AVALANCHE_MAINNET]: 43114,
  [NETWORKS.BASE_SEPOLIA]: 84532,
  [NETWORKS.BASE_MAINNET]: 8453,
} as const;

/**
 * USDC contract addresses per network
 */
export const USDC_ADDRESSES = {
  [NETWORKS.AVALANCHE_FUJI]: '0x5425890298aed601595a70AB815c96711a31Bc65',
  [NETWORKS.AVALANCHE_MAINNET]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  [NETWORKS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [NETWORKS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
} as const;

/**
 * USDC token decimals (6 for all networks)
 */
export const USDC_DECIMALS = 6;

// =============================================================================
// X402 PROTOCOL CONSTANTS
// =============================================================================

/**
 * Current x402 protocol version
 */
export const X402_VERSION = 1;

/**
 * Supported payment schemes
 */
export const PAYMENT_SCHEMES = {
  EXACT: 'exact',
} as const;

/**
 * Default payment timeout in seconds
 */
export const DEFAULT_PAYMENT_TIMEOUT_SECONDS = 60;

// =============================================================================
// HTTP CONSTANTS
// =============================================================================

/**
 * Custom HTTP headers used in x402 protocol
 */
export const HTTP_HEADERS = {
  X_PAYMENT: 'x-payment',
  X_PAYMENT_RESPONSE: 'x-payment-response',
} as const;

/**
 * HTTP Status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
