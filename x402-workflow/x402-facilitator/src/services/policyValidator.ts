/**
 * Policy Validator Service - validates payment requests against policies
 */

import type { PaymentRequest, PolicyCheckResult } from '../types/index.js';
import { getUserPolicy, isMerchantAuthorized, getRemainingDailyAllowance } from '../store/userPolicy.js';
import { isMerchantWhitelisted, getMerchantInfo } from '../store/merchantWhitelist.js';

export function validatePaymentRequest(request: PaymentRequest): PolicyCheckResult {
  const { userAddress, challenge, signedPayload } = request;
  const amount = BigInt(challenge.amount);

  console.log(`[Policy] User: ${userAddress}, Amount: ${Number(amount) / 1e6} USDC`);

  // 1. Merchant whitelist (warning only)
  const isWhitelisted = isMerchantWhitelisted(challenge.merchantAddress);
  if (isWhitelisted) {
    const info = getMerchantInfo(challenge.merchantAddress);
    console.log(`[Policy] Merchant whitelisted: ${info?.name}`);
  }

  // 2. User authorization
  if (!isMerchantAuthorized(userAddress, challenge.merchantAddress, challenge.merchantDomain)) {
    return { allowed: false, reason: 'Merchant not authorized by user' };
  }

  // 3. Transaction limit
  const policy = getUserPolicy(userAddress);
  if (amount > policy.maxTransactionAmount) {
    return { allowed: false, reason: `Exceeds limit (max: ${policy.maxTransactionAmount})`, maxAllowed: policy.maxTransactionAmount };
  }

  // 4. Daily limit
  const remainingDaily = getRemainingDailyAllowance(userAddress);
  if (amount > remainingDaily) {
    return { allowed: false, reason: `Exceeds daily limit (remaining: ${remainingDaily})`, remainingDaily };
  }

  // 5. From address match
  if (signedPayload.authorization.from.toLowerCase() !== userAddress.toLowerCase()) {
    return { allowed: false, reason: 'From address mismatch' };
  }

  // 6. To address match
  if (signedPayload.authorization.to.toLowerCase() !== challenge.merchantAddress.toLowerCase()) {
    return { allowed: false, reason: 'Destination mismatch' };
  }

  // 7. Amount match
  if (BigInt(signedPayload.authorization.value) !== amount) {
    return { allowed: false, reason: 'Amount mismatch' };
  }

  console.log('[Policy] All checks passed');
  return { allowed: true, remainingDaily: remainingDaily - amount };
}
