/**
 * Product Controller - product API handlers
 */

import type { Request, Response } from 'express';
import { getProductById, getAllProducts } from '../data/products.js';
import { HTTP_STATUS } from '../constants/index.js';

export function listProducts(_req: Request, res: Response): void {
  const products = getAllProducts();
  console.log(`[Products] Returning ${products.length} products`);
  res.status(HTTP_STATUS.OK).json({ success: true, data: products, count: products.length });
}

export function getProduct(req: Request, res: Response): void {
  const { id } = req.params;
  const product = getProductById(id);
  
  if (!product) {
    console.log(`[Products] Not found: ${id}`);
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Product not found' });
    return;
  }
  
  console.log(`[Products] Returning: ${product.name}`);
  res.status(HTTP_STATUS.OK).json({ success: true, data: product });
}
