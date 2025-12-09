/**
 * x402 Facilitator - Express Application
 */

import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method.padEnd(6)} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'x402-facilitator' }));
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
