import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { issueRouter } from './routes/issue.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { aiRouter } from './routes/ai.routes.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxyHops);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use((request, _response, next) => { request.requestId = crypto.randomUUID(); next(); });
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(':method :status :response-time ms'));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/issues', issueRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
