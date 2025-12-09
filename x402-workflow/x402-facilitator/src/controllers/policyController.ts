/**
 * Policy Controller
 * 
 * Manages user policies, merchant authorizations, and spending limits.
 */

import type { Request, Response } from 'express';
import type { UserPolicy, MerchantInfo } from '../types/index.js';
import {
  getUserPolicy,
  updateUserPolicy,
  authorizeMerchant,
  authorizeDomain,
  getRemainingDailyAllowance,
} from '../store/userPolicy.js';
import {
  getAllMerchants,
  getMerchantInfo,
  addMerchant,
  isMerchantWhitelisted,
} from '../store/merchantWhitelist.js';
import { HTTP_STATUS } from '../constants/index.js';

// =============================================================================
// USER POLICY ENDPOINTS
// =============================================================================

/**
 * GET /api/policy/:userAddress
 * Get user's policy and spending status
 */
export function getPolicy(
  req: Request<{ userAddress: string }>,
  res: Response
): void {
  const { userAddress } = req.params;
  
  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid user address' });
    return;
  }

  const policy = getUserPolicy(userAddress as `0x${string}`);
  const remainingDaily = getRemainingDailyAllowance(userAddress as `0x${string}`);

  res.json({
    ...policy,
    // Convert BigInt to string for JSON
    maxTransactionAmount: policy.maxTransactionAmount.toString(),
    dailySpendingLimit: policy.dailySpendingLimit.toString(),
    spentToday: policy.spentToday.toString(),
    remainingDailyAllowance: remainingDaily.toString(),
    fundedBalance: policy.fundedBalance?.toString(),
  });
}

/**
 * POST /api/policy/:userAddress
 * Update user's policy settings
 */
export function updatePolicy(
  req: Request<{ userAddress: string }>,
  res: Response
): void {
  const { userAddress } = req.params;
  const updates = req.body;

  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid user address' });
    return;
  }

  // Convert string amounts to BigInt
  const policyUpdates: Partial<UserPolicy> = {};
  
  if (updates.maxTransactionAmount) {
    policyUpdates.maxTransactionAmount = BigInt(updates.maxTransactionAmount);
  }
  if (updates.dailySpendingLimit) {
    policyUpdates.dailySpendingLimit = BigInt(updates.dailySpendingLimit);
  }
  if (typeof updates.autoPayEnabled === 'boolean') {
    policyUpdates.autoPayEnabled = updates.autoPayEnabled;
  }

  const updated = updateUserPolicy(userAddress as `0x${string}`, policyUpdates);

  res.json({
    success: true,
    policy: {
      ...updated,
      maxTransactionAmount: updated.maxTransactionAmount.toString(),
      dailySpendingLimit: updated.dailySpendingLimit.toString(),
      spentToday: updated.spentToday.toString(),
    },
  });
}

/**
 * POST /api/policy/:userAddress/authorize-merchant
 * Authorize a merchant for automatic payments
 */
export function authorizeMerchantEndpoint(
  req: Request<{ userAddress: string }>,
  res: Response
): void {
  const { userAddress } = req.params;
  const { merchantAddress, domain } = req.body;

  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid user address' });
    return;
  }

  if (merchantAddress) {
    authorizeMerchant(userAddress as `0x${string}`, merchantAddress as `0x${string}`);
  }
  
  if (domain) {
    authorizeDomain(userAddress as `0x${string}`, domain);
  }

  const policy = getUserPolicy(userAddress as `0x${string}`);

  res.json({
    success: true,
    authorizedMerchants: policy.authorizedMerchants,
    authorizedDomains: policy.authorizedDomains,
  });
}

// =============================================================================
// MERCHANT WHITELIST ENDPOINTS
// =============================================================================

/**
 * GET /api/merchants
 * Get all whitelisted merchants
 */
export function listMerchants(_req: Request, res: Response): void {
  const merchants = getAllMerchants();
  res.json({ merchants });
}

/**
 * GET /api/merchants/:address
 * Get merchant info by address
 */
export function getMerchant(
  req: Request<{ address: string }>,
  res: Response
): void {
  const { address } = req.params;
  
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid merchant address' });
    return;
  }

  const merchant = getMerchantInfo(address as `0x${string}`);
  
  if (!merchant) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Merchant not found' });
    return;
  }

  res.json({ merchant });
}

/**
 * POST /api/merchants
 * Add a merchant to whitelist (admin only in production)
 */
export function addMerchantEndpoint(req: Request, res: Response): void {
  const merchantData: MerchantInfo = req.body;

  if (!merchantData.address || !merchantData.name || !merchantData.domain) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Missing required fields: address, name, domain',
    });
    return;
  }

  if (isMerchantWhitelisted(merchantData.address)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Merchant already whitelisted' });
    return;
  }

  addMerchant({
    ...merchantData,
    verified: merchantData.verified ?? false,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    merchant: merchantData,
  });
}
