// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadController = require('./controllers/upload.controller');
const cronController = require('./controllers/cron.controller');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/upload/signature', uploadController.getSignedUploadUrl);
app.get('/api/cron/trigger', cronController.checkAndExecuteJobs);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
