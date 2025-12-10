/**
 * Environment Configuration
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config = {
  server: {
    port: getIntEnv('PORT', 3001),
  },
  facilitator: {
    privateKey: getRequiredEnv('FACILITATOR_PRIVATE_KEY') as `0x${string}`,
    defaultSpendingLimit: BigInt(getOptionalEnv('DEFAULT_SPENDING_LIMIT', '100000000')),
  },
  rpc: {
    url: getOptionalEnv('RPC_URL', 'https://api.avax-test.network/ext/bc/C/rpc'),
  },
  contracts: {
    vaultAddress: getRequiredEnv('VAULT_CONTRACT_ADDRESS') as `0x${string}`,
  },
};
