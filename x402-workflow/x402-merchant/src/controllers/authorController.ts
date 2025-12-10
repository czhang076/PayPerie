import type { Request, Response } from 'express';
import { processUpload } from '../services/contentService.js';
import { addOrUpdateProduct } from '../data/products.js';
import type { Product } from '../types/index.js';

export async function uploadBook(req: Request, res: Response): Promise<void> {
  const file = req.file;
  const { title, price, authorAddress } = req.body as { title?: string; price?: string; authorAddress?: string };

  if (!file) {
    res.status(400).json({ error: 'PDF file is required' });
    return;
  }
  if (!title || !price || !authorAddress) {
    res.status(400).json({ error: 'Missing required fields: title, price, authorAddress' });
    return;
  }

  const priceNumber = Number(price);
  if (Number.isNaN(priceNumber) || priceNumber <= 0) {
    res.status(400).json({ error: 'Invalid price' });
    return;
  }

  try {
    const meta = await processUpload(file.buffer, { title, price: priceNumber, authorAddress });

    const product: Product = {
      id: meta.bookId,
      name: meta.title,
      description: `Book: ${meta.title} (${meta.totalPages} pages)`,
      priceUSD: meta.pricePerPageUSD,
      priceInBaseUnits: meta.pricePerPageBaseUnits,
      authorAddress: meta.authorAddress,
    };

    addOrUpdateProduct(product);

    res.status(201).json({
      success: true,
      bookId: meta.bookId,
      totalPages: meta.totalPages,
      pricePerPageUSD: meta.pricePerPageUSD,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
}
