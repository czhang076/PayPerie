import type { Request, Response, NextFunction } from 'express';
import { buildPaymentRequired, decodePaymentHeader, validatePaymentPayload, validatePaymentAmount } from '../utils/index.js';
import { HTTP_HEADERS, HTTP_STATUS } from '../constants/index.js';
import { getMetadata } from '../services/contentService.js';
import { config } from '../config/index.js';
import { getFacilitator } from '../services/index.js';
import type { PaymentPayload } from '../types/index.js';

export async function paywall(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { bookId, pageIndex } = req.params as { bookId: string; pageIndex: string };
  const pageNum = parseInt(pageIndex, 10);
  if (Number.isNaN(pageNum) || pageNum < 1) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid page index' });
    return;
  }

  const metadata = await getMetadata(bookId);
  if (!metadata) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Book not found' });
    return;
  }

  if (pageNum > metadata.totalPages) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Page not found' });
    return;
  }

  const priceInBaseUnits = metadata.pricePerPageBaseUnits;
  const paymentHeader = req.headers[HTTP_HEADERS.X_PAYMENT] as string | undefined;

  if (!paymentHeader) {
    const paymentRequired = buildPaymentRequired(
      `/api/read/${bookId}/${pageNum}`,
      priceInBaseUnits,
      `Read ${metadata.title} - page ${pageNum}`,
      { bookId, pageIndex: pageNum, authorAddress: metadata.authorAddress }
    );
    res.status(HTTP_STATUS.PAYMENT_REQUIRED).json(paymentRequired);
    return;
  }

  const paymentPayload = decodePaymentHeader(paymentHeader);
  if (!paymentPayload) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid X-PAYMENT header format' });
    return;
  }

  const structureValidation = validatePaymentPayload(paymentPayload);
  if (!structureValidation.valid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: structureValidation.error ?? 'Invalid payload' });
    return;
  }

  const { authorization } = paymentPayload.payload;
  const amountValidation = validatePaymentAmount(authorization.value, priceInBaseUnits);
  if (!amountValidation.valid) {
    res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({ error: 'Insufficient payment', required: priceInBaseUnits, received: authorization.value });
    return;
  }

  try {
    const facilitator = getFacilitator(config.merchant.privateKey as `0x${string}`);
    const result = await facilitator.executePayment(paymentPayload as PaymentPayload);

    if (!result.success) {
      res.status(HTTP_STATUS.FORBIDDEN).json({ error: result.error || 'Payment failed' });
      return;
    }

    res.locals.bookMetadata = metadata;
    res.locals.pageIndex = pageNum;
    res.locals.paymentResult = result;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment processing error';
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
  }
}
