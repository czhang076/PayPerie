import { Router } from 'express';
import paymentRoutes from './paymentRoutes.js';
import authorRoutes from './authorRoutes.js';
import readRoutes from './readRoutes.js';

const router = Router();

router.use('/', paymentRoutes);
router.use('/author', authorRoutes);
router.use('/read', readRoutes);

export const apiRoutes = router;
export default router;
