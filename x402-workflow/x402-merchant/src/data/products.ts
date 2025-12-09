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
    'jeans-501',
    {
      id: 'jeans-501',
      name: "Levi's 501 Original Jeans",
      description: 'Classic straight fit jeans with button fly',
      priceUSD: 0.02,
      priceInBaseUnits: usdToBaseUnits(0.02),
    },
  ],
  [
    'tshirt-basic',
    {
      id: 'tshirt-basic',
      name: 'Basic Cotton T-Shirt',
      description: 'Comfortable 100% cotton t-shirt',
      priceUSD: 0.02,
      priceInBaseUnits: usdToBaseUnits(0.02),
    },
  ],
  [
    'sneakers-classic',
    {
      id: 'sneakers-classic',
      name: 'Classic Canvas Sneakers',
      description: 'Timeless canvas sneakers for everyday wear',
      priceUSD: 0.02,
      priceInBaseUnits: usdToBaseUnits(0.02),
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
 * Check if product exists
 * 
 * @param id - Product ID
 * @returns True if product exists
 */
export function productExists(id: string): boolean {
  return productCatalog.has(id);
}

