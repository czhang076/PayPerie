/**
 * Facilitator Constants
 */

export const NETWORKS = {
  AVALANCHE_FUJI: 'avalanche-fuji',
  AVALANCHE_MAINNET: 'avalanche-mainnet',
} as const;

export const CHAIN_IDS: Record<string, number> = {
  [NETWORKS.AVALANCHE_FUJI]: 43113,
  [NETWORKS.AVALANCHE_MAINNET]: 43114,
};

export const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  [NETWORKS.AVALANCHE_FUJI]: '0x5425890298aed601595a70AB815c96711a31Bc65',
  [NETWORKS.AVALANCHE_MAINNET]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
};

export const RPC_URLS: Record<string, string> = {
  [NETWORKS.AVALANCHE_FUJI]: 'https://api.avax-test.network/ext/bc/C/rpc',
  [NETWORKS.AVALANCHE_MAINNET]: 'https://api.avax.network/ext/bc/C/rpc',
};

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Default limits
export const DEFAULTS = {
  MAX_TRANSACTION_AMOUNT: BigInt(100_000_000), // 100 USDC
  DAILY_SPENDING_LIMIT: BigInt(500_000_000),   // 500 USDC per day
} as const;
