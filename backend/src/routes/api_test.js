const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test route working' });
});

module.exports = router;