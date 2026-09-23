const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// 1. Auth Rate Limiter (login / reset endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 15,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again in 15 minutes.',
  },
});

// 2. User Creation Limiter
const userCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 2000 : 30,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'Rate limit exceeded: You have provisioned too many accounts in this window. Please wait.',
  },
});

// 3. File Upload Limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 30,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'Too many file uploads in a short duration. Please try again in 15 minutes.',
  },
});

// 4. General Authenticated API Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 300,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'Too many requests across workspace endpoints. Please slow down.',
  },
});

module.exports = {
  authLimiter,
  userCreateLimiter,
  uploadLimiter,
  apiLimiter,
};
