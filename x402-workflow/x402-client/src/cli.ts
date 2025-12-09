/**
 * x402 Client CLI
 * 
 * Command-line interface for purchasing products from x402-enabled merchants.
 * 
 * Usage:
 *   npm run buy -- <productId>
 *   npm run buy -- tshirt-basic
 */

import { env } from './config/index.js';
import { X402Client } from './client/index.js';

async function main(): Promise<void> {
  // Get product ID from command line
  const productId = process.argv[2];
  
  if (!productId) {
    console.log('Usage: npm run buy -- <productId>');
    console.log('');
    console.log('Available products:');
    
    // Create client and list products
    const client = new X402Client({
      merchantUrl: env.merchantUrl,
      privateKey: env.privateKey,
    });
    
    const products = await client.listProducts();
    console.log(JSON.stringify(products, null, 2));
    process.exit(1);
  }

  // Create client
  const client = new X402Client({
    merchantUrl: env.merchantUrl,
    privateKey: env.privateKey,
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    x402 Payment Client');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Merchant URL: ${env.merchantUrl}`);
  console.log(`Wallet Address: ${client.getAddress()}`);
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    // Attempt purchase
    const result = await client.purchase(productId);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    Purchase Result');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Success: ${result.success}`);
    console.log(`Status Code: ${result.statusCode}`);
    console.log('');
    console.log('Response Data:');
    console.log(JSON.stringify(result.data, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
