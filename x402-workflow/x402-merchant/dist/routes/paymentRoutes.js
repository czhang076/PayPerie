/**
 * 支付路由
 *
 * 实现 x402 支付流程的核心端点：
 * 1. GET /products - 获取商品列表
 * 2. POST /buy/:productId - 购买商品（需要支付）
 */
import { Router } from 'express';
import { getProductById, getAllProducts } from '../data/products.js';
import { buildPaymentRequired, decodePaymentHeader, encodePaymentResponse, validatePaymentPayload } from '../utils/x402.js';
const router = Router();
// ============================================================
// GET /products - 获取所有商品（无需支付）
// ============================================================
router.get('/products', (_req, res) => {
    const products = getAllProducts();
    console.log(`[Merchant] 📦 返回 ${products.length} 个商品`);
    res.json({ products });
});
// ============================================================
// GET /products/:id - 获取单个商品详情（无需支付）
// ============================================================
router.get('/products/:id', (req, res) => {
    const product = getProductById(req.params.id);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
    }
    console.log(`[Merchant] 📦 返回商品详情: ${product.name}`);
    res.json({ product });
});
// ============================================================
// POST /buy/:productId - 购买商品（需要 x402 支付）
// 
// 这是 x402 流程的核心！
// 
// 流程：
// 1. 客户端发送 POST /buy/jeans-501（无 X-PAYMENT header）
// 2. 服务器返回 402 Payment Required + 支付详情
// 3. 客户端创建 EIP-712 签名的支付授权
// 4. 客户端重新发送请求（带 X-PAYMENT header）
// 5. 服务器验证并结算支付
// 6. 服务器返回 200 OK + 商品/收据
// ============================================================
router.post('/buy/:productId', async (req, res) => {
    const { productId } = req.params;
    // 1. 查找商品
    const product = getProductById(productId);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
    }
    console.log(`\n[Merchant] 🛒 收到购买请求: ${product.name} ($${product.priceUSD})`);
    // 2. 检查 X-PAYMENT header
    const paymentHeader = req.headers['x-payment'];
    // ========================================
    // 情况 A: 没有支付 header → 返回 402
    // ========================================
    if (!paymentHeader) {
        console.log('[Merchant] ⚠️  未发现支付凭证，返回 402 Payment Required...');
        // 构建 402 响应
        const paymentRequired = buildPaymentRequired(`/buy/${productId}`, product.priceInBaseUnits, `Purchase ${product.name}`, {
            productId: product.id,
            productName: product.name,
        });
        // 返回 402 状态码和支付要求
        res.status(402).json(paymentRequired);
        console.log('[Merchant] 📤 已发送 402 Challenge:');
        console.log(`           - 金额: ${product.priceInBaseUnits} (${product.priceUSD} USDC)`);
        console.log(`           - 收款地址: ${paymentRequired.accepts[0].payTo}`);
        console.log(`           - 网络: ${paymentRequired.accepts[0].network}`);
        return;
    }
    // ========================================
    // 情况 B: 有支付 header → 验证并处理
    // ========================================
    console.log('[Merchant] 🔐 收到 X-PAYMENT header，开始验证...');
    // 3. 解码支付载荷
    const paymentPayload = decodePaymentHeader(paymentHeader);
    if (!paymentPayload) {
        console.log('[Merchant] ❌ 无法解码支付载荷');
        res.status(400).json({ error: 'Invalid X-PAYMENT header format' });
        return;
    }
    console.log('[Merchant] 📋 支付载荷解码成功:');
    console.log(`           - 方案: ${paymentPayload.scheme}`);
    console.log(`           - 网络: ${paymentPayload.network}`);
    console.log(`           - 付款人: ${paymentPayload.payload.authorization.from}`);
    console.log(`           - 金额: ${paymentPayload.payload.authorization.value}`);
    // 4. 基本验证
    const validation = validatePaymentPayload(paymentPayload);
    if (!validation.valid) {
        console.log(`[Merchant] ❌ 验证失败: ${validation.error}`);
        res.status(400).json({ error: validation.error });
        return;
    }
    // 5. 验证金额是否足够
    const paidAmount = BigInt(paymentPayload.payload.authorization.value);
    const requiredAmount = BigInt(product.priceInBaseUnits);
    if (paidAmount < requiredAmount) {
        console.log(`[Merchant] ❌ 金额不足: 支付 ${paidAmount}, 需要 ${requiredAmount}`);
        res.status(402).json({
            error: 'Insufficient payment amount',
            required: product.priceInBaseUnits,
            received: paymentPayload.payload.authorization.value
        });
        return;
    }
    console.log('[Merchant] ✅ 基本验证通过');
    // ========================================
    // TODO: Step 3 将在这里添加 Facilitator 调用
    // - 调用 Facilitator 验证 EIP-712 签名
    // - 调用 Facilitator 提交链上交易
    // ========================================
    // 6. 模拟成功响应（在 Step 3 中我们会真正调用 Facilitator）
    console.log('[Merchant] 🎯 TODO: 将调用 Facilitator 进行链上结算...');
    console.log('[Merchant] ✨ (模拟) 支付成功！');
    // 构建支付响应
    const paymentResponse = {
        success: true,
        transaction: '0x' + '0'.repeat(64), // 模拟交易哈希
        network: 'avalanche-fuji',
        payer: paymentPayload.payload.authorization.from,
        errorReason: null,
    };
    // 设置 X-PAYMENT-RESPONSE header
    res.setHeader('X-PAYMENT-RESPONSE', encodePaymentResponse(paymentResponse));
    // 返回成功响应
    res.json({
        success: true,
        message: `Successfully purchased ${product.name}!`,
        receipt: {
            productId: product.id,
            productName: product.name,
            amount: product.priceUSD,
            currency: 'USDC',
            payer: paymentPayload.payload.authorization.from,
            timestamp: new Date().toISOString(),
            transactionHash: paymentResponse.transaction,
        }
    });
    console.log('[Merchant] 📤 已返回购买成功响应\n');
});
export default router;
//# sourceMappingURL=paymentRoutes.js.map