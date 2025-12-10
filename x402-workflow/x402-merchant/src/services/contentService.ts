import { mkdir, writeFile, readFile, stat } from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { USDC_DECIMALS } from '../constants/index.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'books');

export interface BookMetadata {
  bookId: string;
  title: string;
  authorAddress: string;
  pricePerPageUSD: number;
  pricePerPageBaseUnits: string;
  totalPages: number;
  createdAt: string;
}

function usdToBaseUnits(usd: number): string {
  const baseUnits = Math.floor(usd * Math.pow(10, USDC_DECIMALS));
  return baseUnits.toString();
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

function makeBookId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book';
  return `${slug}-${Date.now()}`;
}

export async function processUpload(
  fileBuffer: Buffer,
  metadata: { title: string; price: number; authorAddress: string; bookId?: string }
): Promise<BookMetadata> {
  const bookId = metadata.bookId || makeBookId(metadata.title);
  const bookDir = path.join(UPLOAD_ROOT, bookId);
  await ensureDir(bookDir);

  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
    newDoc.addPage(copiedPage);
    const pdfBytes = await newDoc.save();
    const pagePath = path.join(bookDir, `page_${i + 1}.pdf`);
    await writeFile(pagePath, pdfBytes);
  }

  const pricePerPageUSD = Number(metadata.price);
  const meta: BookMetadata = {
    bookId,
    title: metadata.title,
    authorAddress: metadata.authorAddress,
    pricePerPageUSD,
    pricePerPageBaseUnits: usdToBaseUnits(pricePerPageUSD),
    totalPages,
    createdAt: new Date().toISOString(),
  };

  await writeFile(path.join(bookDir, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf-8');
  return meta;
}

export async function getMetadata(bookId: string): Promise<BookMetadata | null> {
  try {
    const bookDir = path.join(UPLOAD_ROOT, bookId);
    const metaPath = path.join(bookDir, 'metadata.json');
    await stat(metaPath);
    const data = await readFile(metaPath, 'utf-8');
    return JSON.parse(data) as BookMetadata;
  } catch {
    return null;
  }
}

export async function getPage(bookId: string, pageIndex: number): Promise<Buffer | null> {
  try {
    const bookDir = path.join(UPLOAD_ROOT, bookId);
    const pagePath = path.join(bookDir, `page_${pageIndex}.pdf`);
    await stat(pagePath);
    return await readFile(pagePath);
  } catch {
    return null;
  }
}
