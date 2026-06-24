// src/index.js
require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const uploadController   = require('./controllers/upload.controller');
const cronController     = require('./controllers/cron.controller');
const authController     = require('./controllers/auth.controller');
const sessionController  = require('./controllers/session.controller');
const postController     = require('./controllers/post.controller');
const engagementController = require('./controllers/engagement.controller');
const { authMiddleware } = require('./middleware/auth.middleware');

const app = express();

// ── Security Headers (helmet) ─────────────────────────────────────────────────
// Sets X-Frame-Options, X-Content-Type-Options, HSTS, CSP, etc.
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Required if you embed Cloudinary videos
  contentSecurityPolicy: false,     // Relax CSP to allow Cloudinary video embeds (tighten per-page in production)
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Restrict to your Vercel frontend URL. Credentials: true is required for cookies.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,           // Production Vercel URL
  'http://localhost:5173',            // Local Vite dev server
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Render cron pings, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} not allowed`));
    }
  },
  credentials: true,    // Required to send/receive cookies cross-origin
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Auth routes: max 20 requests per 15 minutes (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter: max 200 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth Routes (public) ──────────────────────────────────────────────────────
app.post('/api/profiles/register', authLimiter, authController.createProfile);
app.post('/api/profiles/login',    authLimiter, authController.loginProfile);
app.post('/api/profiles/logout',   authController.logout);
app.get( '/api/profiles/me',       authMiddleware, authController.getMe);

// ── Protected Routes (require valid JWT cookie) ───────────────────────────────
app.use('/api/sessions',    apiLimiter, authMiddleware);
app.use('/api/posts',       apiLimiter, authMiddleware);
app.use('/api/upload',      apiLimiter, authMiddleware);
app.use('/api/engagement',  apiLimiter, authMiddleware);

// ── Session Linking Routes ─────────────────────────────────────────────────────
app.get('/api/sessions/link/:profileId/:platform', sessionController.linkSession);
app.get('/api/sessions/:profileId',                sessionController.getLinkedSessions);
app.delete('/api/sessions/:profileId/:platform',    sessionController.deleteSession);

// ── Post Routes ────────────────────────────────────────────────────────────────
app.post(  '/api/posts',       postController.createPost);
app.get(   '/api/posts/:profileId', postController.getPosts);
app.patch( '/api/posts/:id',   postController.updatePost);
app.delete('/api/posts/:id',   postController.deletePost);

// ── Upload Routes ──────────────────────────────────────────────────────────────
app.get('/api/upload/signature', uploadController.getSignedUploadUrl);

// ── Engagement Routes ──────────────────────────────────────────────────────────
app.post('/api/engagement/comment',      engagementController.comment);
app.post('/api/engagement/check-follow', engagementController.checkFollow);
app.post('/api/engagement/follow',       engagementController.followUser);
app.post('/api/engagement/auto-dm',      engagementController.autoDM);

// ── Cron / Automation (Render cron job pings this endpoint) ───────────────────
// NOT auth-protected — pinged externally by Render's cron service
app.get('/api/cron/trigger', cronController.checkAndExecuteJobs);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
