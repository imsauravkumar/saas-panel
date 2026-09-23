const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// ═══════════════════════════════════════════════════
// STARTUP ENVIRONMENT GUARD
// ═══════════════════════════════════════════════════
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('[STARTUP ERROR] Please check your .env file. Server cannot start safely.');
  process.exit(1);
}

const connectDB = require('./src/config/db');
const { initializeFirebase } = require('./src/config/firebase');
const { setupSocket } = require('./src/sockets/chatSocket');
const { sanitizeInput } = require('./src/middleware/sanitize');
const { authLimiter, apiLimiter } = require('./src/middleware/rateLimiters');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const workspaceRoutes = require('./src/routes/workspaceRoutes');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Firebase Admin SDK
initializeFirebase();

// Allowed Origins for CORS & Sockets
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

// Setup Socket.IO with CORS validation
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl) or if in allowed list
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});
app.set('io', io);
setupSocket(io);

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })
);

// CORS Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS'));
      }
    },
    credentials: true,
  })
);

// Response Compression (gzip) — reduces payload sizes by ~70%
app.use(
  compression({
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

// Payload Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL Operator Injection Sanitization
app.use(sanitizeInput);

// Static uploads serving with cache headers
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
  })
);

// Global API Rate Limiting
app.use('/api', apiLimiter);

// Specific Auth Limiting
app.use('/api/auth', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/workspace', workspaceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString(), platform: 'SAAS Nexus' });
});

// Root route
app.get('/', (req, res) => {
  res.send('SAAS Nexus Backend API is running securely.');
});

// 404 Resource Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Resource endpoint not found',
    message: 'Resource endpoint not found',
  });
});

// Centralized Error Handling Middleware (Masks internal stack traces in production)
app.use((err, req, res, _next) => {
  console.error('[Unhandled Server Error]:', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  const humanMessage =
    isProd && (!err.status || err.status === 500)
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(err.status || 500).json({
    success: false,
    error: humanMessage,
    message: humanMessage,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    `[SAAS Nexus Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`
  );
});
