/**
 * Express 应用配置
 *
 * 设置中间件、路由等
 */
import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/paymentRoutes.js';
// 创建 Express 应用
const app = express();
// ============================================================
// 中间件配置
// ============================================================
// 启用 CORS - 允许跨域请求
// 在生产环境中应该限制允许的来源
app.use(cors());
// 解析 JSON 请求体
app.use(express.json());
// 请求日志中间件
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});
// ============================================================
// 路由配置
// ============================================================
// 健康检查端点
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'x402-merchant',
        timestamp: new Date().toISOString()
    });
});
// x402 支付相关路由
app.use('/api', paymentRoutes);
// 404 处理
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
export default app;
//# sourceMappingURL=app.js.map