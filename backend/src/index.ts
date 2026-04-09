import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import errorHandler from './middleware/errorHandler.js';
import { ErrorCodes, error, success } from './utils/response.js';
import prisma from './utils/prisma.js';

import authRoutes from './routes/auth.js';
import appRoutes from './routes/apps.js';
import postRoutes from './routes/posts.js';
import topicRoutes from './routes/topics.js';
import commentRoutes from './routes/comments.js';
import requestRoutes from './routes/requests.js';
import searchRoutes from './routes/search.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import assetRoutes from './routes/assets.js';
import homeRoutes from './routes/home.js';
import adsRoutes from './routes/ads.js';
import downloadsRoutes from './routes/downloads.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = YAML.load(path.resolve(__dirname, '../swagger.yaml'));
const uploadsDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((item) => item.trim()) ?? '*'
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json(
    success({
      name: 'Triangle Portal CMS API',
      version: '1.0.0',
      docs: '/api-docs',
      health: '/health'
    })
  );
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json(success({ status: 'ok', database: 'connected' }, 'service healthy'));
  } catch (err) {
    console.error('[healthcheck failed]', err);
    res.status(500).json(
      error(ErrorCodes.INTERNAL_ERROR, 'service unhealthy', {
        status: 'error',
        database: 'disconnected'
      })
    );
  }
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/download', downloadsRoutes);
app.use('/uploads', express.static(uploadsDir));

app.use((_req, res) => {
  res.status(404).json(error(ErrorCodes.NOT_FOUND, 'resource not found'));
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Triangle Portal CMS API is running on http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
});

function shutdown() {
  server.close(() => {
    console.log('Server stopped');
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
