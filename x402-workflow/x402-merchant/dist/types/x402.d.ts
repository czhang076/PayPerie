/**
 * x402 协议类型定义
 *
 * 这个文件定义了 x402 支付协议中使用的所有数据结构
 * 参考: https://build.avax.network/academy/blockchain/x402-payment-infrastructure
 */
/**
 * 支付方案类型
 * - "exact": 使用 EIP-3009 的 transferWithAuthorization（精确金额授权）
 */
export type PaymentScheme = 'exact';
/**
 * 支持的区块链网络
 */
export type NetworkId = 'avalanche-fuji' | 'avalanche-mainnet' | 'base-sepolia' | 'base-mainnet';
/**
 * 单个支付选项 - 商家接受的一种支付方式
 *
 * 当商家返回 402 响应时，会包含一个或多个这样的选项
 * 客户端可以选择其中任意一个来完成支付
 */
export interface PaymentRequirement {
    /** 支付方案，目前主要使用 "exact" */
    scheme: PaymentScheme;
    /** 区块链网络，如 "avalanche-fuji" */
    network: NetworkId;
    /**
     * 最大支付金额（最小单位）
     * 例如 USDC 有 6 位小数，"10000" = 0.01 USDC
     */
    maxAmountRequired: string;
    /** 请求的资源路径，如 "/api/buy-jeans" */
    resource: string;
    /** 支付描述，人类可读 */
    description: string;
    /** 商家钱包地址 - 资金将发送到这里 */
    payTo: string;
    /** 代币合约地址 - 如 USDC 合约地址 */
    asset: string;
    /** 支付超时时间（秒） */
    maxTimeoutSeconds: number;
    /** 可选：额外的商品信息 */
    extra?: {
        productId?: string;
        productName?: string;
        [key: string]: unknown;
    };
}
/**
 * 402 响应体 - 商家返回给客户端的完整支付要求
 */
export interface PaymentRequiredResponse {
    /** x402 协议版本 */
    x402Version: number;
    /** 商家接受的支付选项列表 */
    accepts: PaymentRequirement[];
    /** 错误信息 */
    error: string;
}
/**
 * EIP-3009 授权数据
 *
 * 这是 USDC 等代币使用的 "无 gas 转账" 标准
 * 用户签名授权后，任何人都可以代为提交交易
 */
export interface EIP3009Authorization {
    /** 付款人地址 */
    from: string;
    /** 收款人地址（商家） */
    to: string;
    /** 转账金额（最小单位字符串） */
    value: string;
    /** 授权生效时间（Unix 时间戳） */
    validAfter: string;
    /** 授权过期时间（Unix 时间戳） */
    validBefore: string;
    /** 唯一随机数，防止重放攻击 */
    nonce: string;
}
/**
 * 支付载荷 - 包含签名和授权数据
 */
export interface PaymentPayload {
    /** x402 协议版本 */
    x402Version: number;
    /** 支付方案 */
    scheme: PaymentScheme;
    /** 区块链网络 */
    network: NetworkId;
    /** 载荷数据 */
    payload: {
        /** EIP-712 签名 */
        signature: string;
        /** EIP-3009 授权数据 */
        authorization: EIP3009Authorization;
    };
}
/**
 * X-PAYMENT-RESPONSE header 的解码内容
 */
export interface PaymentResponse {
    /** 支付是否成功 */
    success: boolean;
    /** 区块链交易哈希 */
    transaction: string | null;
    /** 使用的网络 */
    network: NetworkId;
    /** 付款人地址 */
    payer: string | null;
    /** 错误原因（如果失败） */
    errorReason: string | null;
}
/**
 * 商品信息
 */
export interface Product {
    id: string;
    name: string;
    description: string;
    /** 价格（USDC，人类可读格式，如 50.00） */
    priceUSD: number;
    /** 价格（最小单位，如 50000000 = 50 USDC） */
    priceInBaseUnits: string;
}
//# sourceMappingURL=x402.d.ts.map