import { Router } from 'express';
import { readPage } from '../controllers/readController.js';
import { paywall } from '../middleware/index.js';

const router = Router();

router.get('/:bookId/:pageIndex', paywall, readPage);

export default router;
