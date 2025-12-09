/**
 * x402 工具函数
 *
 * 提供构建 402 响应、解析 X-PAYMENT header 等功能
 */
import { config } from '../config/env.js';
/**
 * Avalanche Fuji 测试网的 USDC 合约地址
 *
 * 注意：这是测试网地址，主网地址不同！
 * Fuji USDC: 0x5425890298aed601595a70AB815c96711a31Bc65
 */
export const FUJI_USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
/**
 * 构建 402 Payment Required 响应
 *
 * 当客户端请求资源但未提供有效支付时，商家返回这个响应
 * 告诉客户端需要支付多少、支付到哪里、使用什么代币等
 *
 * @param resource - 请求的资源路径
 * @param amountInBaseUnits - 金额（最小单位）
 * @param description - 支付描述
 * @param extra - 额外信息（如商品详情）
 */
export function buildPaymentRequired(resource, amountInBaseUnits, description, extra) {
    const paymentRequirement = {
        scheme: 'exact',
        network: 'avalanche-fuji',
        maxAmountRequired: amountInBaseUnits,
        resource: resource,
        description: description,
        payTo: config.merchant.address,
        asset: config.merchant.acceptedToken,
        maxTimeoutSeconds: 60,
        extra: extra,
    };
    return {
        x402Version: 1,
        accepts: [paymentRequirement],
        error: 'X-PAYMENT header is required',
    };
}
/**
 * 解码 X-PAYMENT header
 *
 * X-PAYMENT header 是 Base64 编码的 JSON
 * 包含客户端的支付授权和签名
 *
 * @param headerValue - Base64 编码的支付载荷
 * @returns 解码后的支付载荷，如果无效则返回 null
 */
export function decodePaymentHeader(headerValue) {
    try {
        const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
        const payload = JSON.parse(decoded);
        // 基本验证
        if (!payload.x402Version || !payload.scheme || !payload.payload) {
            console.error('[x402] Invalid payment payload structure');
            return null;
        }
        return payload;
    }
    catch (error) {
        console.error('[x402] Failed to decode X-PAYMENT header:', error);
        return null;
    }
}
/**
 * 编码支付响应为 X-PAYMENT-RESPONSE header
 *
 * 商家在成功处理支付后，返回这个 header
 * 包含交易哈希、网络等信息，让客户端可以验证支付已完成
 *
 * @param response - 支付响应数据
 * @returns Base64 编码的响应
 */
export function encodePaymentResponse(response) {
    const json = JSON.stringify(response);
    return Buffer.from(json).toString('base64');
}
/**
 * 验证支付载荷的基本结构
 *
 * 注意：这只是基本的结构验证
 * 真正的签名验证需要在 Facilitator 中完成
 *
 * @param payload - 支付载荷
 * @returns 是否有效
 */
export function validatePaymentPayload(payload) {
    // 检查版本
    if (payload.x402Version !== 1) {
        return { valid: false, error: 'Unsupported x402 version' };
    }
    // 检查方案
    if (payload.scheme !== 'exact') {
        return { valid: false, error: 'Unsupported payment scheme' };
    }
    // 检查网络
    if (payload.network !== 'avalanche-fuji') {
        return { valid: false, error: 'Unsupported network' };
    }
    // 检查授权数据
    const auth = payload.payload?.authorization;
    if (!auth) {
        return { valid: false, error: 'Missing authorization data' };
    }
    // 检查必要字段
    if (!auth.from || !auth.to || !auth.value || !auth.nonce) {
        return { valid: false, error: 'Incomplete authorization data' };
    }
    // 检查收款地址是否是我们的商家地址
    if (auth.to.toLowerCase() !== config.merchant.address.toLowerCase()) {
        return { valid: false, error: 'Payment recipient mismatch' };
    }
    // 检查签名
    if (!payload.payload?.signature) {
        return { valid: false, error: 'Missing signature' };
    }
    return { valid: true };
}
//# sourceMappingURL=x402.js.map