import { Router } from 'express';
import multer from 'multer';
import { uploadBook } from '../controllers/authorController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/upload', upload.single('file'), uploadBook);

export default router;
