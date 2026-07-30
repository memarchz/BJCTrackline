import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import teamRoutes from './routes/teams';
import taskRoutes from './routes/tasks';
import torRoutes from './routes/tor';
import chatRoutes from './routes/chat';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tor', torRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);
