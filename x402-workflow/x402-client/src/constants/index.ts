/**
 * x402 Client Constants
 * 
 * Network configurations and protocol constants for the x402 payment client.
 */

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

/**
 * Supported blockchain networks
 */
export const NETWORKS = {
  AVALANCHE_FUJI: 'avalanche-fuji',
  AVALANCHE_MAINNET: 'avalanche-mainnet',
} as const;

/**
 * Chain IDs for each network
 */
export const CHAIN_IDS: Record<string, number> = {
  [NETWORKS.AVALANCHE_FUJI]: 43113,
  [NETWORKS.AVALANCHE_MAINNET]: 43114,
};

/**
 * USDC contract addresses per network
 */
export const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  [NETWORKS.AVALANCHE_FUJI]: '0x5425890298aed601595a70AB815c96711a31Bc65',
  [NETWORKS.AVALANCHE_MAINNET]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
};

/**
 * RPC URLs for each network
 */
export const RPC_URLS: Record<string, string> = {
  [NETWORKS.AVALANCHE_FUJI]: 'https://api.avax-test.network/ext/bc/C/rpc',
  [NETWORKS.AVALANCHE_MAINNET]: 'https://api.avax.network/ext/bc/C/rpc',
};

// =============================================================================
// x402 PROTOCOL
// =============================================================================

/**
 * x402 protocol version
 */
export const X402_VERSION = 1;

/**
 * HTTP headers used in x402 protocol
 */
export const HTTP_HEADERS = {
  X_PAYMENT: 'X-PAYMENT',
  X_PAYMENT_RESPONSE: 'X-PAYMENT-RESPONSE',
  CONTENT_TYPE: 'Content-Type',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  PAYMENT_REQUIRED: 402,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

// =============================================================================
// EIP-712 TYPED DATA DOMAIN
// =============================================================================

/**
 * EIP-712 domain for USDC transferWithAuthorization
 * This must match the USDC contract's domain separator
 */
export const getEIP712Domain = (chainId: number, usdcAddress: `0x${string}`) => ({
  name: 'USD Coin',
  version: '2',
  chainId: BigInt(chainId),
  verifyingContract: usdcAddress,
});

/**
 * EIP-3009 TransferWithAuthorization types for EIP-712 signing
 */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
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
// DEFAULTS
// =============================================================================

export const DEFAULTS = {
  MERCHANT_URL: 'http://localhost:3000',
  TIMEOUT_BUFFER_SECONDS: 5, // Buffer before timeout
} as const;
