// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadController = require('./controllers/upload.controller');
const cronController = require('./controllers/cron.controller');
const authController = require('./controllers/auth.controller');
const sessionController = require('./controllers/session.controller');
const postController = require('./controllers/post.controller');

const app = express();
app.use(cors());
app.use(express.json());

// ── Auth Routes ────────────────────────────────────────────────────────────────
app.get('/api/profiles', authController.getProfiles);
app.post('/api/profiles/register', authController.createProfile);
app.post('/api/profiles/login', authController.loginProfile);

// ── Session Linking Routes ─────────────────────────────────────────────────────
app.get('/api/sessions/link/:profileId/:platform', sessionController.linkSession);
app.get('/api/sessions/:profileId', sessionController.getLinkedSessions);

// ── Post Routes ────────────────────────────────────────────────────────────────
app.post('/api/posts', postController.createPost);
app.get('/api/posts/:profileId', postController.getPosts);
app.patch('/api/posts/:id', postController.updatePost);
app.delete('/api/posts/:id', postController.deletePost);

// ── Upload Routes ──────────────────────────────────────────────────────────────
app.get('/api/upload/signature', uploadController.getSignedUploadUrl);

// ── Cron / Automation Routes ───────────────────────────────────────────────────
app.get('/api/cron/trigger', cronController.checkAndExecuteJobs);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
