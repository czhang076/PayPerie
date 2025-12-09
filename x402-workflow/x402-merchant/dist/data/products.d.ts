/**
 * 商品目录
 *
 * 在真实应用中，这些数据会存储在数据库中
 * 这里为了演示，我们硬编码一些商品
 */
import type { Product } from '../types/x402.js';
/**
 * 将人类可读的 USD 金额转换为 USDC 最小单位
 * USDC 有 6 位小数，所以 1 USDC = 1,000,000 基本单位
 *
 * @param usd - USD 金额，如 50.00
 * @returns 最小单位字符串，如 "50000000"
 */
export declare function usdToBaseUnits(usd: number): string;
/**
 * 商品目录
 */
export declare const products: Map<string, Product>;
/**
 * 根据 ID 获取商品
 */
export declare function getProductById(id: string): Product | undefined;
/**
 * 获取所有商品列表
 */
export declare function getAllProducts(): Product[];
//# sourceMappingURL=products.d.ts.map