/**
 * Environment Configuration
 * 
 * Loads and validates environment variables for the x402 client.
 */

import { config } from 'dotenv';

// Load .env file
config();

/**
 * Get a required environment variable
 * @throws Error if the variable is not set
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Validate that a string is a valid hex private key
 */
function validatePrivateKey(key: string): `0x${string}` {
  if (!key.startsWith('0x')) {
    key = `0x${key}`;
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters).');
  }
  return key as `0x${string}`;
}

/**
 * Client environment configuration
 */
export const env = {
  /**
   * Private key for signing payment authorizations
   * WARNING: Never commit real private keys!
   */
  get privateKey(): `0x${string}` {
    return validatePrivateKey(getRequiredEnv('PRIVATE_KEY'));
  },

  /**
   * Merchant server URL
   */
  get merchantUrl(): string {
    return getOptionalEnv('MERCHANT_URL', 'http://localhost:3000');
  },
};
