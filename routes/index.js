const express = require('express');
const router = express.Router();
const { getActiveUserCount } = require('../modules/userManager');

// Home route
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// API route to get user count
router.get('/api/stats', (req, res) => {
  res.json({
    activeUsers: getActiveUserCount(),
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

module.exports = router;
