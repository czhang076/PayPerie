import type { Request, Response } from 'express';
import { getPage } from '../services/contentService.js';
import { HTTP_STATUS } from '../constants/index.js';

export async function readPage(req: Request, res: Response): Promise<void> {
  const { bookId } = req.params as { bookId: string; pageIndex: string };
  const pageIndex = res.locals.pageIndex as number | undefined;

  if (!pageIndex) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing page index' });
    return;
  }

  const buffer = await getPage(bookId, pageIndex);
  if (!buffer) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Page not found' });
    return;
  }

  res.contentType('application/pdf').send(buffer);
}
