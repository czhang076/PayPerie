/**
 * Payment Controller - handles payment execution requests
 */

import type { Request, Response } from 'express';
import type { PaymentRequest, PaymentResult } from '../types/index.js';
import { validatePaymentRequest } from '../services/policyValidator.js';
import { getExecutor } from '../services/executor.js';
import { recordSpending } from '../store/userPolicy.js';
import { HTTP_STATUS } from '../constants/index.js';

export async function executePayment(
  req: Request<object, PaymentResult, PaymentRequest>,
  res: Response<PaymentResult>
): Promise<void> {
  try {
    const paymentRequest = req.body;
    console.log('\n[Facilitator] Payment request received');

    if (!paymentRequest.userAddress || !paymentRequest.challenge || !paymentRequest.signedPayload) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid request', errorCode: 'POLICY_VIOLATION' });
      return;
    }

    // Policy validation
    const policyCheck = validatePaymentRequest(paymentRequest);
    if (!policyCheck.allowed) {
      console.log(`[Facilitator] Policy failed: ${policyCheck.reason}`);
      res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: policyCheck.reason, errorCode: 'POLICY_VIOLATION' });
      return;
    }

    // On-chain execution
    const executor = getExecutor();
    const result = await executor.executePayment(paymentRequest);

    if (result.success) {
      recordSpending(paymentRequest.userAddress, BigInt(paymentRequest.challenge.amount));
      console.log(`[Facilitator] Success: ${result.transactionHash}`);
      res.status(HTTP_STATUS.OK).json(result);
    } else {
      console.log(`[Facilitator] Failed: ${result.error}`);
      res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }
  } catch (error) {
    console.error('[Facilitator] Error:', error instanceof Error ? error.message : error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false, error: error instanceof Error ? error.message : 'Internal error', errorCode: 'TRANSACTION_FAILED'
    });
  }
}
