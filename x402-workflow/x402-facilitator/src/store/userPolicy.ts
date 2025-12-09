/**
 * User Policy Store - in-memory storage for user policies
 */

import type { UserPolicy } from '../types/index.js';
import { DEFAULTS } from '../constants/index.js';

const userPolicies: Map<string, UserPolicy> = new Map();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getUserPolicy(userAddress: `0x${string}`): UserPolicy {
  const key = userAddress.toLowerCase();
  if (!userPolicies.has(key)) {
    userPolicies.set(key, {
      userAddress,
      maxTransactionAmount: DEFAULTS.MAX_TRANSACTION_AMOUNT,
      dailySpendingLimit: DEFAULTS.DAILY_SPENDING_LIMIT,
      spentToday: BigInt(0),
      lastResetTimestamp: Date.now(),
      authorizedMerchants: [],
      authorizedDomains: [],
      autoPayEnabled: true,
    });
  }
  return userPolicies.get(key)!;
}

export function updateUserPolicy(userAddress: `0x${string}`, updates: Partial<UserPolicy>): UserPolicy {
  const policy = getUserPolicy(userAddress);
  const updated = { ...policy, ...updates };
  userPolicies.set(userAddress.toLowerCase(), updated);
  return updated;
}

export function authorizeMerchant(userAddress: `0x${string}`, merchantAddress: `0x${string}`): void {
  const policy = getUserPolicy(userAddress);
  const addr = merchantAddress.toLowerCase() as `0x${string}`;
  if (!policy.authorizedMerchants.includes(addr)) {
    policy.authorizedMerchants.push(addr);
  }
}

export function authorizeDomain(userAddress: `0x${string}`, domain: string): void {
  const policy = getUserPolicy(userAddress);
  const d = domain.toLowerCase();
  if (!policy.authorizedDomains.includes(d)) {
    policy.authorizedDomains.push(d);
  }
}

export function recordSpending(userAddress: `0x${string}`, amount: bigint): void {
  const policy = getUserPolicy(userAddress);
  if (Date.now() - policy.lastResetTimestamp > ONE_DAY_MS) {
    policy.spentToday = BigInt(0);
    policy.lastResetTimestamp = Date.now();
  }
  policy.spentToday += amount;
}

export function isMerchantAuthorized(userAddress: `0x${string}`, merchantAddress: `0x${string}`, merchantDomain?: string): boolean {
  const policy = getUserPolicy(userAddress);
  if (policy.authorizedMerchants.includes(merchantAddress.toLowerCase() as `0x${string}`)) return true;
  if (merchantDomain && policy.authorizedDomains.includes(merchantDomain.toLowerCase())) return true;
  return policy.autoPayEnabled; // Auto-authorize for testing
}

export function getRemainingDailyAllowance(userAddress: `0x${string}`): bigint {
  const policy = getUserPolicy(userAddress);
  if (Date.now() - policy.lastResetTimestamp > ONE_DAY_MS) return policy.dailySpendingLimit;
  const remaining = policy.dailySpendingLimit - policy.spentToday;
  return remaining > BigInt(0) ? remaining : BigInt(0);
}
