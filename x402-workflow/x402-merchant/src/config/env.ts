/**
 * @fileoverview Environment Configuration
 * @description Loads and validates environment variables
 */

import * as dotenv from 'dotenv';
import { NETWORKS, CHAIN_IDS, USDC_ADDRESSES } from '../constants/index.js';

// Load environment variables from .env file
dotenv.config();

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface MerchantConfig {
  /** Merchant wallet address to receive payments */
  address: string;
  /** Merchant private key for signing transactions (Facilitator) */
  privateKey: string;
  /** Accepted token contract address (e.g., USDC) */
  acceptedToken: string;
  /** Blockchain network identifier */
  network: string;
  /** Chain ID for the network */
  chainId: number;
}

export interface ServerConfig {
  /** Server port number */
  port: number;
  /** Node environment (development, production, test) */
  nodeEnv: string;
}

export interface AppConfig {
  server: ServerConfig;
  merchant: MerchantConfig;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get required environment variable or throw error
 * @param key - Environment variable name
 * @returns Environment variable value
 * @throws Error if variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `   Please add it to your .env file.`
    );
  }
  return value.trim();
}

/**
 * Get optional environment variable with default value
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value?.trim() || defaultValue;
}

/**
 * Parse integer from environment variable
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set or invalid
 * @returns Parsed integer value
 */
function getIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

/**
 * Application configuration
 * Loaded from environment variables with validation
 */
export const config: AppConfig = {
  server: {
    port: getIntEnv('PORT', 3000),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  },
  merchant: {
    address: getRequiredEnv('MERCHANT_WALLET_ADDRESS'),
    privateKey: getRequiredEnv('PRIVATE_KEY'),
    acceptedToken: getOptionalEnv(
      'ACCEPTED_TOKEN_ADDRESS',
      USDC_ADDRESSES[NETWORKS.AVALANCHE_FUJI]
    ),
    network: NETWORKS.AVALANCHE_FUJI,
    chainId: CHAIN_IDS[NETWORKS.AVALANCHE_FUJI],
  },
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate merchant address on startup
if (!isValidAddress(config.merchant.address)) {
  throw new Error(
    `❌ Invalid MERCHANT_WALLET_ADDRESS: ${config.merchant.address}\n` +
    `   Must be a valid Ethereum address (0x followed by 40 hex characters).`
  );
}
