/**
 * x402 Payment Facilitator Server
 */

import app from './app.js';
import { config } from './config/index.js';

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💳 x402 Payment Facilitator                               ║
╠═══════════════════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}                           ║
║  Network: avalanche-fuji (43113)                       ║
╠═══════════════════════════════════════════════════════════╣
║  POST /api/pay          GET  /api/policy/:address      ║
║  POST /api/policy/:addr  POST /api/merchants           ║
╚═══════════════════════════════════════════════════════════╝
`);
});

process.on('SIGINT', () => { console.log('\n[Server] Shutting down...'); process.exit(0); });
