import rateLimit from 'express-rate-limit';

// Global API rate limit (generous for live chatting, polling, and development)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000, // Very generous limit to prevent accidental user lockout
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.includes('127.0.0.1');
    const isPolling = req.path?.includes('/messages') || req.path?.includes('/health') || req.path?.includes('/activity');
    return isLocal || isPolling;
  },
  message: {
    success: false,
    error: 'Too many requests from this IP. Please wait a moment and try again.'
  }
});

// Stricter rate limit for file uploads to prevent storage abuse
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Generous limit
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
  },
  message: {
    success: false,
    error: 'Upload limit reached. Please wait a moment before creating more transfers.'
  }
});

// Download rate limit
export const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
  },
  message: {
    success: false,
    error: 'Download rate limit reached. Please try again later.'
  }
});

// Rate limiter for administrator authentication attempts
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  skipSuccessfulRequests: true, // Successful administrator sign-ins never count toward lockout limit
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
  },
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in a few minutes.'
  }
});
