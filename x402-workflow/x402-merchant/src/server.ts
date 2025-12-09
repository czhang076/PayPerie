/**
 * x402 Merchant Server Entry Point
 */

import app from './app.js';
import { config } from './config/index.js';

const { port } = config.server;
const { address, network, chainId } = config.merchant;

app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🏪 x402 Merchant Server                                  ║
╠═══════════════════════════════════════════════════════════╣
║  Server:  http://localhost:${port}                           ║
║  Wallet:  ${address.slice(0, 10)}...${address.slice(-6)}                     ║
║  Network: ${network} (${chainId})                       ║
╠═══════════════════════════════════════════════════════════╣
║  GET  /health          GET  /api/products                 ║
║  GET  /api/products/:id POST /api/buy/:id (x402)          ║
╚═══════════════════════════════════════════════════════════╝
`);
});

process.on('SIGTERM', () => { console.log('\n[Server] Shutting down...'); process.exit(0); });
process.on('SIGINT', () => { console.log('\n[Server] Shutting down...'); process.exit(0); });

