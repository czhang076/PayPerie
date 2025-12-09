/**
 * 商品目录
 *
 * 在真实应用中，这些数据会存储在数据库中
 * 这里为了演示，我们硬编码一些商品
 */
/**
 * 将人类可读的 USD 金额转换为 USDC 最小单位
 * USDC 有 6 位小数，所以 1 USDC = 1,000,000 基本单位
 *
 * @param usd - USD 金额，如 50.00
 * @returns 最小单位字符串，如 "50000000"
 */
export function usdToBaseUnits(usd) {
    // USDC 有 6 位小数
    const USDC_DECIMALS = 6;
    const baseUnits = Math.floor(usd * Math.pow(10, USDC_DECIMALS));
    return baseUnits.toString();
}
/**
 * 商品目录
 */
export const products = new Map([
    [
        'jeans-501',
        {
            id: 'jeans-501',
            name: "Levi's 501 Original Jeans",
            description: 'Classic straight fit jeans with button fly',
            priceUSD: 50.00,
            priceInBaseUnits: usdToBaseUnits(50.00), // "50000000"
        }
    ],
    [
        'tshirt-basic',
        {
            id: 'tshirt-basic',
            name: 'Basic Cotton T-Shirt',
            description: 'Comfortable 100% cotton t-shirt',
            priceUSD: 15.00,
            priceInBaseUnits: usdToBaseUnits(15.00), // "15000000"
        }
    ],
    [
        'sneakers-classic',
        {
            id: 'sneakers-classic',
            name: 'Classic Canvas Sneakers',
            description: 'Timeless canvas sneakers for everyday wear',
            priceUSD: 75.00,
            priceInBaseUnits: usdToBaseUnits(75.00), // "75000000"
        }
    ],
]);
/**
 * 根据 ID 获取商品
 */
export function getProductById(id) {
    return products.get(id);
}
/**
 * 获取所有商品列表
 */
export function getAllProducts() {
    return Array.from(products.values());
}
//# sourceMappingURL=products.js.map