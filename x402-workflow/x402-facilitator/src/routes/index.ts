/**
 * API Routes
 */

import { Router } from 'express';
import {
  executePayment,
  getPolicy,
  updatePolicy,
  authorizeMerchantEndpoint,
  listMerchants,
  getMerchant,
  addMerchantEndpoint,
} from '../controllers/index.js';

const router = Router();

// =============================================================================
// PAYMENT ROUTES
// =============================================================================

/**
 * POST /api/pay
 * Execute a payment (main endpoint for AI Agents)
 */
router.post('/pay', executePayment);

// =============================================================================
// USER POLICY ROUTES
// =============================================================================

/**
 * GET /api/policy/:userAddress
 * Get user's policy and spending status
 */
router.get('/policy/:userAddress', getPolicy);

/**
 * POST /api/policy/:userAddress
 * Update user's policy settings
 */
router.post('/policy/:userAddress', updatePolicy);

/**
 * POST /api/policy/:userAddress/authorize-merchant
 * Authorize a merchant for a user
 */
router.post('/policy/:userAddress/authorize-merchant', authorizeMerchantEndpoint);

// =============================================================================
// MERCHANT WHITELIST ROUTES
// =============================================================================

/**
 * GET /api/merchants
 * List all whitelisted merchants
 */
router.get('/merchants', listMerchants);

/**
 * GET /api/merchants/:address
 * Get merchant info
 */
router.get('/merchants/:address', getMerchant);

/**
 * POST /api/merchants
 * Add merchant to whitelist
 */
router.post('/merchants', addMerchantEndpoint);

export default router;
