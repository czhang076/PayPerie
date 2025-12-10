/**
 * @fileoverview Product Catalog
 * @description Product data and helper functions
 * 
 * In a real application, this would be stored in a database.
 * For demonstration purposes, we use in-memory data.
 */

import type { Product } from '../types/index.js';
import { USDC_DECIMALS } from '../constants/index.js';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert human-readable USD amount to USDC base units
 * 
 * USDC has 6 decimals, so:
 * - 1 USDC = 1,000,000 base units
 * - 50.00 USDC = 50,000,000 base units
 * 
 * @param usd - USD amount (e.g., 50.00)
 * @returns Base units as string (e.g., "50000000")
 */
export function usdToBaseUnits(usd: number): string {
  const baseUnits = Math.floor(usd * Math.pow(10, USDC_DECIMALS));
  return baseUnits.toString();
}

/**
 * Convert USDC base units to human-readable USD amount
 * 
 * @param baseUnits - Base units as string (e.g., "50000000")
 * @returns USD amount (e.g., 50.00)
 */
export function baseUnitsToUsd(baseUnits: string): number {
  return parseInt(baseUnits, 10) / Math.pow(10, USDC_DECIMALS);
}

// =============================================================================
// PRODUCT CATALOG
// =============================================================================

/**
 * Product catalog stored in a Map for O(1) lookup by ID
 */
const productCatalog: Map<string, Product> = new Map([
  [
    'novel-1-page-1',
    {
      id: 'novel-1-page-1',
      name: 'Novel One — Page 1',
      description: 'The opening page of our serialized fiction.',
      priceUSD: 0.01,
      priceInBaseUnits: usdToBaseUnits(0.01),
      authorAddress: '0x1111111111111111111111111111111111111111',
    },
  ],
  [
    'novel-1-page-2',
    {
      id: 'novel-1-page-2',
      name: 'Novel One — Page 2',
      description: 'Continues the story with a key reveal.',
      priceUSD: 0.01,
      priceInBaseUnits: usdToBaseUnits(0.01),
      authorAddress: '0x1111111111111111111111111111111111111111',
    },
  ],
  [
    'novel-1-bundle',
    {
      id: 'novel-1-bundle',
      name: 'Novel One — Pages 1-5',
      description: 'Bundle of the first five pages.',
      priceUSD: 0.05,
      priceInBaseUnits: usdToBaseUnits(0.05),
      authorAddress: '0x2222222222222222222222222222222222222222',
    },
  ],
]);

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get product by ID
 * 
 * @param id - Product ID
 * @returns Product if found, undefined otherwise
 */
export function getProductById(id: string): Product | undefined {
  return productCatalog.get(id);
}

/**
 * Get all products
 * 
 * @returns Array of all products
 */
export function getAllProducts(): Product[] {
  return Array.from(productCatalog.values());
}

/**
 * Add or update a product in the catalog
 */
export function addOrUpdateProduct(product: Product): void {
  productCatalog.set(product.id, product);
}

/**
 * Check if product exists
 * 
 * @param id - Product ID
 * @returns True if product exists
 */
export function productExists(id: string): boolean {
  return productCatalog.has(id);
}

