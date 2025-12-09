/**
 * x402 Merchant - Express Application
 */

import express from 'express';
import cors from 'cors';
import { apiRoutes } from './routes/index.js';
import { requestLogger, notFoundHandler, errorHandler } from './middleware/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'x402-merchant', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

