import 'dotenv/config';
import express from 'express';
import { ensureSignTables } from './utils/signTables.js';
import { cleanupExpiredSignArtifacts, executeSignTask } from './utils/signService.js';

const app = express();
const port = Number(process.env.SIGN_SERVICE_PORT || 58086);
const internalToken = String(process.env.SIGN_SERVICE_TOKEN || '').trim();

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

function authenticateInternalRequest(req, res, next) {
  if (!internalToken) {
    return res.status(500).json({
      success: false,
      message: '签名服务未配置内部令牌',
    });
  }

  const token = String(req.headers['x-sign-service-token'] || '').trim();
  if (!token || token !== internalToken) {
    return res.status(403).json({
      success: false,
      message: '签名服务内部令牌无效',
    });
  }

  return next();
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'sign service healthy',
  });
});

app.post('/internal/sign/tasks/:taskId/execute', authenticateInternalRequest, async (req, res) => {
  const taskId = Number(req.params.taskId || 0);
  if (!taskId) {
    return res.status(400).json({
      success: false,
      message: '任务编号无效',
    });
  }

  void executeSignTask(taskId).catch((error) => {
    console.error('[sign service execute failed]', error);
  });

  return res.json({
    success: true,
    message: '签名任务已接收',
  });
});

app.post('/internal/sign/cleanup', authenticateInternalRequest, async (_req, res) => {
  await cleanupExpiredSignArtifacts();
  return res.json({
    success: true,
    message: '签名产物清理完成',
  });
});

await ensureSignTables();
await cleanupExpiredSignArtifacts();

app.listen(port, () => {
  console.log(`Triangle Sign Service is running on http://localhost:${port}`);
});
