import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import shareRoutes from './routes/shareRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// Secure HTTP headers with allowance for static assets and cross-origin embedding
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Flexible CORS setup: allows development localhost, production domains, and preview deploys
const allowedOrigins = [
  'http://localhost:5180',
  'http://127.0.0.1:5180',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, same-origin)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any vercel/netlify/render/pages.dev deployment domains or localhost
      const isAllowedHost = 
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowedHost) {
        return callback(null, true);
      }

      return callback(null, true); // Permissive so custom user domains always work
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-share-password'],
    credentials: true
  })
);

// Standard parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Mount administrative routes (private control center)
app.use('/api/admin', adminRoutes);

// Mount share routes
app.use('/api', shareRoutes);

// Serve Frontend in Unified Production Deployment (Render, Railway, Fly.io, etc.)
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // Client-side SPA routing fallback: send index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Fallback API root information endpoint in development
  app.get('/', (req, res) => {
    res.json({
      service: 'QuickShare API',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        health: '/api/health',
        upload: 'POST /api/upload',
        session: 'GET /api/session/:token',
        download: 'GET /api/download/:token/:fileId',
        downloadAll: 'GET /api/download-all/:token',
        revoke: 'POST /api/revoke'
      }
    });
  });
}

// 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
