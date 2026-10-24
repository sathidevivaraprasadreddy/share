import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import shareRoutes from './routes/shareRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Flexible CORS setup: allows development localhost & production domains
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
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any vercel/netlify/render/pages.dev deployment domains
      const isAllowedHost = 
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.onrender.com');

      if (isAllowedHost) {
        return callback(null, true);
      }

      return callback(null, true); // Permissive in dev, or allow custom origins
    },
    methods: ['GET', 'POST', 'OPTIONS'],
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

// Root information endpoint
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

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
