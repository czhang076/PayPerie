/**
 * Payment Controller - x402 payment flow
 */

import type { Request, Response } from 'express';
import { getProductById } from '../data/products.js';
import { buildPaymentRequired, decodePaymentHeader, encodePaymentResponse, validatePaymentPayload, validatePaymentAmount } from '../utils/index.js';
import type { PaymentResponse, PurchaseReceipt, PaymentPayload } from '../types/index.js';
import { HTTP_STATUS, HTTP_HEADERS } from '../constants/index.js';
import { config } from '../config/index.js';
import { getFacilitator } from '../services/index.js';

interface PurchaseSuccessResponse { success: true; message: string; receipt: PurchaseReceipt; }
interface PurchaseErrorResponse { success: false; error: string; required?: string; received?: string; }

/**
 * Purchase product with x402 payment
 * Flow: 1. No header -> 402  2. With header -> validate & settle -> 200
 */
export async function purchaseProduct(
  req: Request,
  res: Response<PurchaseSuccessResponse | PurchaseErrorResponse | object>
): Promise<void> {
  const { productId } = req.params;
  const product = getProductById(productId);
  
  if (!product) {
    console.log(`[Payment] Product not found: ${productId}`);
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Product not found' });
    return;
  }

  console.log(`[Payment] Purchase: ${product.name} ($${product.priceUSD})`);

  const paymentHeader = req.headers[HTTP_HEADERS.X_PAYMENT] as string | undefined;

  // No payment header -> Return 402
  if (!paymentHeader) {
    console.log('[Payment] No credentials, returning 402...');
    const paymentRequired = buildPaymentRequired(
      `/api/buy/${productId}`,
      product.priceInBaseUnits,
      `Purchase: ${product.name}`,
      { productId: product.id, productName: product.name }
    );
    res.status(HTTP_STATUS.PAYMENT_REQUIRED).json(paymentRequired);
    console.log(`[Payment] 402 sent: ${product.priceInBaseUnits} to ${paymentRequired.accepts[0].payTo}`);
    return;
  }

  // Has payment header -> Validate and process
  console.log('[Payment] Validating X-PAYMENT header...');

  const paymentPayload = decodePaymentHeader(paymentHeader);
  if (!paymentPayload) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid X-PAYMENT header format' });
    return;
  }

  const { authorization } = paymentPayload.payload;
  console.log(`[Payment] From: ${authorization.from}, Amount: ${authorization.value}`);

  const structureValidation = validatePaymentPayload(paymentPayload);
  if (!structureValidation.valid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: structureValidation.error ?? 'Invalid payload' });
    return;
  }

  const amountValidation = validatePaymentAmount(authorization.value, product.priceInBaseUnits);
  if (!amountValidation.valid) {
    res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
      success: false, error: 'Insufficient payment', required: product.priceInBaseUnits, received: authorization.value
    });
    return;
  }

  // Execute on-chain settlement
  console.log('[Payment] Executing on-chain settlement...');
  try {
    const facilitator = getFacilitator(config.merchant.privateKey as `0x${string}`);
    const result = await facilitator.executePayment(paymentPayload as PaymentPayload);

    if (!result.success) {
      console.log(`[Payment] Settlement failed: ${result.error}`);
      res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({ success: false, error: result.error || 'Settlement failed' });
      return;
    }

    console.log('[Payment] Settlement successful!');

    const paymentResponse: PaymentResponse = {
      success: true,
      transaction: result.transactionHash || ('0x' + '0'.repeat(64)),
      network: config.merchant.network as 'avalanche-fuji',
      payer: authorization.from,
      errorReason: null,
    };

    const receipt: PurchaseReceipt = {
      productId: product.id,
      productName: product.name,
      amount: product.priceUSD,
      currency: 'USDC',
      payer: authorization.from,
      timestamp: new Date().toISOString(),
      transactionHash: paymentResponse.transaction,
    };

    res.setHeader(HTTP_HEADERS.X_PAYMENT_RESPONSE.toUpperCase(), encodePaymentResponse(paymentResponse));
    res.status(HTTP_STATUS.OK).json({ success: true, message: `Purchased ${product.name}!`, receipt });
    console.log(`[Payment] Success: ${paymentResponse.transaction}`);
  } catch (error) {
    console.log(`[Payment] Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Payment processing failed' });
  }
}
