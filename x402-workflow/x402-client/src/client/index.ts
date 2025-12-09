/**
 * x402 Client
 * 
 * HTTP client for interacting with x402-enabled merchants.
 * Handles the full payment flow:
 * 1. Send initial request
 * 2. Parse 402 Payment Required response
 * 3. Create signed payment authorization
 * 4. Resend request with X-PAYMENT header
 */

import { HTTP_HEADERS, HTTP_STATUS } from '../constants/index.js';
import { createPaymentAuthorization, encodePaymentHeader, getSignerAddress } from '../signer/index.js';
import type { 
  ClientConfig, 
  PaymentRequiredResponse, 
  PurchaseResult,
  PaymentRequirement,
} from '../types/index.js';

/**
 * x402 Payment Client
 * 
 * Automatically handles HTTP 402 Payment Required responses
 * by creating and sending signed payment authorizations.
 */
export class X402Client {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  /**
   * Get the client's wallet address
   */
  getAddress(): `0x${string}` {
    return getSignerAddress(this.config.privateKey);
  }

  /**
   * Purchase a product from the merchant
   * 
   * This method handles the complete x402 flow:
   * 1. Sends POST request to the purchase endpoint
   * 2. If 402 received, parses payment requirements
   * 3. Creates EIP-712 signed payment authorization
   * 4. Resends request with X-PAYMENT header
   * 
   * @param productId - The product ID to purchase
   * @returns Purchase result with success status and data
   */
  async purchase(productId: string): Promise<PurchaseResult> {
    const url = `${this.config.merchantUrl}/api/buy/${productId}`;
    
    console.log(`\n🛒 Initiating purchase for: ${productId}`);
    console.log(`📍 URL: ${url}`);
    console.log(`👛 Wallet: ${this.getAddress()}`);

    // Step 1: Send initial request (will get 402)
    console.log('\n📤 Sending initial request...');
    const initialResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    // If not 402, return the response as-is
    if (initialResponse.status !== HTTP_STATUS.PAYMENT_REQUIRED) {
      const data = await initialResponse.json();
      console.log(`⚠️ Unexpected status: ${initialResponse.status}`);
      return {
        success: initialResponse.ok,
        statusCode: initialResponse.status,
        data,
      };
    }

    // Step 2: Parse 402 response
    console.log('💰 Received 402 Payment Required');
    const paymentRequired = await initialResponse.json() as PaymentRequiredResponse;
    
    console.log(`📋 x402 Version: ${paymentRequired.x402Version}`);
    console.log(`📋 Payment Options: ${paymentRequired.accepts.length}`);

    if (paymentRequired.accepts.length === 0) {
      throw new Error('No payment options available');
    }

    // Step 3: Select first payment option and create authorization
    const requirement = paymentRequired.accepts[0] as PaymentRequirement;
    console.log('\n📝 Payment Requirement:');
    console.log(`   Network: ${requirement.network}`);
    console.log(`   Amount: ${formatUSDC(requirement.maxAmountRequired)} USDC`);
    console.log(`   Pay To: ${requirement.payTo}`);
    console.log(`   Timeout: ${requirement.maxTimeoutSeconds}s`);

    console.log('\n🔐 Creating EIP-712 signed authorization...');
    const paymentPayload = await createPaymentAuthorization(
      this.config.privateKey,
      requirement
    );
    
    console.log(`   From: ${paymentPayload.payload.authorization.from}`);
    console.log(`   To: ${paymentPayload.payload.authorization.to}`);
    console.log(`   Value: ${paymentPayload.payload.authorization.value}`);
    console.log(`   Nonce: ${paymentPayload.payload.authorization.nonce.slice(0, 18)}...`);

    // Step 4: Encode and send payment
    const paymentHeader = encodePaymentHeader(paymentPayload);
    console.log('\n📤 Sending payment authorization...');
    console.log(`   Header length: ${paymentHeader.length} chars`);

    const paymentResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [HTTP_HEADERS.X_PAYMENT]: paymentHeader,
      },
    });

    const responseData = await paymentResponse.json();

    if (paymentResponse.ok) {
      console.log('\n✅ Payment successful!');
      return {
        success: true,
        statusCode: paymentResponse.status,
        data: responseData,
        receipt: responseData as PurchaseResult['receipt'],
      };
    } else {
      console.log(`\n❌ Payment failed: ${paymentResponse.status}`);
      return {
        success: false,
        statusCode: paymentResponse.status,
        data: responseData,
      };
    }
  }

  /**
   * List available products from the merchant
   */
  async listProducts(): Promise<unknown[]> {
    const url = `${this.config.merchantUrl}/api/products`;
    const response = await fetch(url);
    return response.json() as Promise<unknown[]>;
  }

  /**
   * Get details of a specific product
   */
  async getProduct(productId: string): Promise<unknown> {
    const url = `${this.config.merchantUrl}/api/products/${productId}`;
    const response = await fetch(url);
    return response.json();
  }
}

/**
 * Format USDC amount from base units to human readable
 * @param baseUnits - Amount in base units (6 decimals)
 */
function formatUSDC(baseUnits: string): string {
  const amount = BigInt(baseUnits);
  const whole = amount / BigInt(1_000_000);
  const fraction = amount % BigInt(1_000_000);
  return `${whole}.${fraction.toString().padStart(6, '0')}`;
}
