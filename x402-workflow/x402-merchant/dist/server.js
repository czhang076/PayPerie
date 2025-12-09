/**
 * 服务器入口点
 *
 * 启动 x402 商家服务器
 */
import app from './app.js';
import { config } from './config/env.js';
const PORT = config.port;
// 启动服务器
app.listen(PORT, () => {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   🏪 x402 Merchant Server                                  ║');
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   🌐 Server:    http://localhost:${PORT}                      ║`);
    console.log(`║   💰 Wallet:    ${config.merchant.address.slice(0, 10)}...${config.merchant.address.slice(-8)}       ║`);
    console.log(`║   🔗 Network:   Avalanche Fuji (Chain ID: ${config.merchant.chainId})        ║`);
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║   📚 Available Endpoints:                                  ║');
    console.log('║                                                            ║');
    console.log('║   GET  /health           - Health check                    ║');
    console.log('║   GET  /api/products     - List all products               ║');
    console.log('║   GET  /api/products/:id - Get product details             ║');
    console.log('║   POST /api/buy/:id      - Purchase product (x402)         ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('📝 x402 Payment Flow:');
    console.log('   1. Client sends POST /api/buy/:productId');
    console.log('   2. Server returns 402 Payment Required');
    console.log('   3. Client creates signed payment (EIP-712)');
    console.log('   4. Client retries with X-PAYMENT header');
    console.log('   5. Server verifies and returns resource');
    console.log('\n');
    console.log('⏳ Waiting for requests...\n');
});
//# sourceMappingURL=server.js.map