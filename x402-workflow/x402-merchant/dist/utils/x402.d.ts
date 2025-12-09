/**
 * x402 工具函数
 *
 * 提供构建 402 响应、解析 X-PAYMENT header 等功能
 */
import type { PaymentRequiredResponse, PaymentPayload, PaymentResponse } from '../types/x402.js';
/**
 * Avalanche Fuji 测试网的 USDC 合约地址
 *
 * 注意：这是测试网地址，主网地址不同！
 * Fuji USDC: 0x5425890298aed601595a70AB815c96711a31Bc65
 */
export declare const FUJI_USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
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
export declare function buildPaymentRequired(resource: string, amountInBaseUnits: string, description: string, extra?: Record<string, unknown>): PaymentRequiredResponse;
/**
 * 解码 X-PAYMENT header
 *
 * X-PAYMENT header 是 Base64 编码的 JSON
 * 包含客户端的支付授权和签名
 *
 * @param headerValue - Base64 编码的支付载荷
 * @returns 解码后的支付载荷，如果无效则返回 null
 */
export declare function decodePaymentHeader(headerValue: string): PaymentPayload | null;
/**
 * 编码支付响应为 X-PAYMENT-RESPONSE header
 *
 * 商家在成功处理支付后，返回这个 header
 * 包含交易哈希、网络等信息，让客户端可以验证支付已完成
 *
 * @param response - 支付响应数据
 * @returns Base64 编码的响应
 */
export declare function encodePaymentResponse(response: PaymentResponse): string;
/**
 * 验证支付载荷的基本结构
 *
 * 注意：这只是基本的结构验证
 * 真正的签名验证需要在 Facilitator 中完成
 *
 * @param payload - 支付载荷
 * @returns 是否有效
 */
export declare function validatePaymentPayload(payload: PaymentPayload): {
    valid: boolean;
    error?: string;
};
//# sourceMappingURL=x402.d.ts.map