import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app.js';
import { testDbConnection } from './config/db.js';
import { startCleanupJob } from './services/cleanupService.js';
import { setupSignalingServer } from './services/signalingService.js';

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
  // Test DB connection on startup
  const dbStatus = await testDbConnection();
  if (!dbStatus.connected) {
    console.warn('⚠️ Warning: Database connection check failed:', dbStatus.error);
  } else {
    console.log(`✅ Database connected successfully (${dbStatus.client || 'ready'}).`);
  }

  // Start background expired file cleanup scheduler
  startCleanupJob();

  // Create combined HTTP and WebSocket Server
  const server = http.createServer(app);

  // Setup WebRTC signaling service
  setupSignalingServer(server);

  // Listen on all network interfaces (0.0.0.0)
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 QuickShare backend running on http://0.0.0.0:${PORT}`);
    console.log(`📁 File uploads stored in: ${process.env.UPLOAD_DIR || './uploads'}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('HTTP and WebSocket server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
