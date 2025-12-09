/**
 * AI Agent Configuration
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

export const config = {
  google: {
    apiKey: getRequiredEnv('GOOGLE_AI_API_KEY'),
  },
  user: {
    privateKey: getRequiredEnv('USER_PRIVATE_KEY') as `0x${string}`,
  },
  services: {
    merchantUrl: getOptionalEnv('MERCHANT_URL', 'http://localhost:3000'),
    facilitatorUrl: getOptionalEnv('FACILITATOR_URL', 'http://localhost:3001'),
  },
};
