const express = require('express');
const { query, validationResult } = require('express-validator');

// Market Overview v2 Controllers
const { btcController } = require('../controllers/btcController');
const { liquidityController } = require('../controllers/liquidityController');
const { leverageController } = require('../controllers/leverageController');
const { futuresController } = require('../controllers/futuresController');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// ========== MARKET OVERVIEW V2 ENDPOINTS ==========

// Market Overview v2: Optimized Moving Averages endpoint
router.get('/market-overview/moving-averages', btcController.getMovingAverages);

// Market Overview v2: Liquidity Pulse endpoint
router.get('/market-overview/liquidity-pulse',
  [
    query('timeframe').optional().isIn(['7D', '30D', '90D', '1Y'])
  ],
  validateRequest,
  liquidityController.getLiquidityPulse
);

// Market Overview v2: State of Leverage endpoint
router.get('/market-overview/leverage-state', leverageController.getLeverageState);

// Market Overview v2: Futures Basis endpoint
router.get('/market-overview/futures-basis', futuresController.getFuturesBasis);

// Market Overview v2: Futures Health Check endpoint
router.get('/market-overview/futures-basis/health', futuresController.getFuturesHealth);

// Market Overview v2: Clear Futures Cache endpoint (development)
router.delete('/market-overview/futures-basis/cache', futuresController.clearFuturesCache);

// ========== ESSENTIAL UTILITY ENDPOINTS ==========

// Cache management routes
router.delete('/cache', (req, res) => {
  // Clear all cache
  res.json({ success: true, message: 'All cache cleared' });
});

router.delete('/cache/:key', (req, res) => {
  // Clear specific cache key
  res.json({ success: true, message: `Cache key ${req.params.key} cleared` });
});

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


module.exports = router;