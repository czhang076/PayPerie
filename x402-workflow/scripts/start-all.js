/**
 * x402 Workflow - One-Click Start Script
 * 
 * Starts all services in the correct order:
 * 1. Merchant (port 3000)
 * 2. Facilitator (port 3001)
 * 3. Frontend (port 5173)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const services = [
  { name: 'Merchant', dir: 'x402-merchant', port: 3000, color: '\x1b[31m' },
  { name: 'Facilitator', dir: 'x402-facilitator', port: 3001, color: '\x1b[34m' },
  { name: 'Frontend', dir: 'x402-frontend', port: 5173, color: '\x1b[32m' },
];

const processes = [];

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║   🚀  x402 Payment Protocol - Starting All Services         ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('\n');

for (const service of services) {
  const cwd = join(rootDir, service.dir);
  
  console.log(`${service.color}[${service.name}]\x1b[0m Starting on port ${service.port}...`);
  
  const proc = spawn('npm', ['run', 'dev'], {
    cwd,
    shell: true,
    stdio: 'pipe',
  });
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${service.color}[${service.name}]\x1b[0m ${line}`);
      }
    });
  });
  
  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim() && !line.includes('ExperimentalWarning')) {
        console.log(`${service.color}[${service.name}]\x1b[0m ${line}`);
      }
    });
  });
  
  processes.push(proc);
}

console.log('\n');
console.log('════════════════════════════════════════════════════════════════');
console.log('  Services Starting...');
console.log('');
console.log('  🏪  Merchant:     http://localhost:3000');
console.log('  💳  Facilitator:  http://localhost:3001');
console.log('  🖥️   Frontend:     http://localhost:5173');
console.log('');
console.log('  Press Ctrl+C to stop all services');
console.log('════════════════════════════════════════════════════════════════');
console.log('\n');

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping all services...\n');
  processes.forEach(proc => proc.kill());
  process.exit(0);
});
