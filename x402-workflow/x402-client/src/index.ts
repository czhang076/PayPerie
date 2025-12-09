/**
 * x402 Client Library
 * 
 * Main entry point for the x402 payment client library.
 */

export { X402Client } from './client/index.js';
export { createPaymentAuthorization, encodePaymentHeader, getSignerAddress } from './signer/index.js';
export * from './types/index.js';
export * from './constants/index.js';
