/**
 * Agent Tools
 * 
 * Tools that Claude can use to interact with merchants and the Facilitator.
 */

import { config } from '../config/index.js';
import { signPayment, getWalletAddress } from '../signer/index.js';
import type {
  Product,
  PaymentRequiredResponse,
  PaymentChallenge,
  FacilitatorRequest,
  FacilitatorResponse,
  PurchaseResult,
  ToolResult,
} from '../types/index.js';

/**
 * List available products from merchant
 */
export async function listProducts(): Promise<ToolResult> {
  try {
    const response = await fetch(`${config.services.merchantUrl}/api/products`);
    const products = await response.json() as Product[];
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: `Failed to list products: ${error}` };
  }
}

/**
 * Get product details
 */
export async function getProduct(productId: string): Promise<ToolResult> {
  try {
    const response = await fetch(`${config.services.merchantUrl}/api/products/${productId}`);
    if (!response.ok) {
      return { success: false, error: 'Product not found' };
    }
    const product = await response.json() as Product;
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: `Failed to get product: ${error}` };
  }
}

/**
 * Purchase a product using x402 protocol
 * This is the main purchase flow:
 * 1. Send request to merchant, get 402
 * 2. Sign payment authorization
 * 3. Send to Facilitator for validation and execution
 * 4. Return result
 */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  const userAddress = getWalletAddress(config.user.privateKey);
  
  console.log(`\n🛒 AI Agent: Purchasing ${productId}`);
  console.log(`👛 Using wallet: ${userAddress}`);

  // Step 1: Get 402 challenge from merchant
  console.log('\n📤 Step 1: Requesting payment challenge from merchant...');
  const merchantResponse = await fetch(
    `${config.services.merchantUrl}/api/buy/${productId}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );

  if (merchantResponse.status !== 402) {
    if (merchantResponse.status === 404) {
      return { success: false, error: 'Product not found' };
    }
    return { success: false, error: `Unexpected response: ${merchantResponse.status}` };
  }

  const paymentRequired = await merchantResponse.json() as PaymentRequiredResponse;
  const challenge = paymentRequired.accepts[0] as PaymentChallenge;

  console.log('💰 Received 402 Payment Required:');
  console.log(`   Amount: ${Number(challenge.maxAmountRequired) / 1_000_000} USDC`);
  console.log(`   Pay To: ${challenge.payTo}`);
  console.log(`   Description: ${challenge.description}`);

  // Step 2: Sign payment authorization
  console.log('\n🔐 Step 2: Creating signed payment authorization...');
  const signedPayload = await signPayment(config.user.privateKey, challenge);
  console.log(`   Signature: ${signedPayload.signature.slice(0, 20)}...`);

  // Step 3: Send to Facilitator for validation and execution
  console.log('\n📤 Step 3: Sending to Facilitator for validation...');
  const facilitatorRequest: FacilitatorRequest = {
    userAddress,
    challenge: {
      merchantAddress: challenge.payTo,
      amount: challenge.maxAmountRequired,
      asset: challenge.asset,
      network: challenge.network,
      resource: challenge.resource,
      description: challenge.description,
      timeoutSeconds: challenge.maxTimeoutSeconds,
    },
    signedPayload,
  };

  const facilitatorResponse = await fetch(
    `${config.services.facilitatorUrl}/api/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facilitatorRequest),
    }
  );

  const result = await facilitatorResponse.json() as FacilitatorResponse;

  if (result.success) {
    console.log('\n✅ Purchase successful!');
    console.log(`   Transaction: ${result.transactionHash}`);
    return {
      success: true,
      message: `Successfully purchased ${productId}!`,
      transactionHash: result.transactionHash,
    };
  } else {
    console.log(`\n❌ Purchase failed: ${result.error}`);
    return {
      success: false,
      error: result.error || 'Payment failed',
    };
  }
}

/**
 * Get user's spending policy from Facilitator
 */
export async function getUserPolicy(): Promise<ToolResult> {
  try {
    const userAddress = getWalletAddress(config.user.privateKey);
    const response = await fetch(
      `${config.services.facilitatorUrl}/api/policy/${userAddress}`
    );
    const policy = await response.json();
    return { success: true, data: policy };
  } catch (error) {
    return { success: false, error: `Failed to get policy: ${error}` };
  }
}

/**
 * Authorize a merchant for automatic payments
 */
export async function authorizeMerchant(merchantAddress: string): Promise<ToolResult> {
  try {
    const userAddress = getWalletAddress(config.user.privateKey);
    const response = await fetch(
      `${config.services.facilitatorUrl}/api/policy/${userAddress}/authorize-merchant`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantAddress }),
      }
    );
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: `Failed to authorize merchant: ${error}` };
  }
}

// Tool definitions for Claude
export const toolDefinitions = [
  {
    name: 'list_products',
    description: 'List all available products from the merchant store',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_product',
    description: 'Get details of a specific product by ID',
    input_schema: {
      type: 'object' as const,
      properties: {
        productId: {
          type: 'string',
          description: 'The product ID to look up',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'purchase_product',
    description: 'Purchase a product using cryptocurrency (USDC). This will create a payment authorization, validate it through the Payment Facilitator, and execute the on-chain transaction.',
    input_schema: {
      type: 'object' as const,
      properties: {
        productId: {
          type: 'string',
          description: 'The product ID to purchase',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'get_spending_policy',
    description: 'Get the current spending policy and limits for the user wallet',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'authorize_merchant',
    description: 'Authorize a merchant address for automatic payments',
    input_schema: {
      type: 'object' as const,
      properties: {
        merchantAddress: {
          type: 'string',
          description: 'The merchant wallet address to authorize (0x...)',
        },
      },
      required: ['merchantAddress'],
    },
  },
];

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'list_products':
      return listProducts();
    case 'get_product':
      return getProduct(input.productId as string);
    case 'purchase_product':
      return purchaseProduct(input.productId as string);
    case 'get_spending_policy':
      return getUserPolicy();
    case 'authorize_merchant':
      return authorizeMerchant(input.merchantAddress as string);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}
