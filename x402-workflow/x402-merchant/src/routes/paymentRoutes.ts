/**
 * @fileoverview API Routes
 * @description Defines all API endpoints for the merchant server
 */

import { Router } from 'express';
import {
  listProducts,
  getProduct,
  purchaseProduct,
} from '../controllers/index.js';

const router = Router();

// =============================================================================
// PRODUCT ROUTES
// =============================================================================

/**
 * GET /api/products
 * List all available products
 */
router.get('/products', listProducts);

/**
 * GET /api/products/:id
 * Get product details by ID
 */
router.get('/products/:id', getProduct);

// =============================================================================
// PAYMENT ROUTES (x402)
// =============================================================================

/**
 * POST /api/buy/:productId
 * Purchase a product using x402 payment protocol
 * 
 * Flow:
 * 1. Without X-PAYMENT header → Returns 402 Payment Required
 * 2. With valid X-PAYMENT header → Processes payment and returns receipt
 */
router.post('/buy/:productId', purchaseProduct);

export default router;

