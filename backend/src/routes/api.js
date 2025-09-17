const express = require('express');
const { query, validationResult } = require('express-validator');

// Market Overview v2 Controllers
const { btcController } = require('../controllers/btcController');
const { liquidityController } = require('../controllers/liquidityController');
const { leverageController } = require('../controllers/leverageController');
const { futuresController } = require('../controllers/futuresController');
const { rotationController } = require('../controllers/rotationController');
const { etfController } = require('../controllers/etfController');
const { marketOverviewController } = require('../controllers/marketOverviewController');

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

// Market Overview v2: Main aggregated endpoint (ultra-conservative caching)
router.get('/market-overview', marketOverviewController.getMarketOverview);

// Market Overview v2: Health status endpoint
router.get('/market-overview/health', marketOverviewController.getHealthStatus);

// Market Overview v2: Monitoring dashboard endpoint
router.get('/market-overview/monitoring', marketOverviewController.getMonitoringDashboard);

// Market Overview v2: Reset monitoring metrics (admin)
router.post('/market-overview/monitoring/reset', marketOverviewController.resetMonitoring);

// Market Overview v2: Individual indicator endpoints
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

// Market Overview v2: Rotation Breadth endpoint
router.get('/market-overview/rotation-breadth', rotationController.getRotationBreadth);

// Market Overview v2: ETF Flows endpoint
router.get('/market-overview/etf-flows',
  [
    query('period').optional().isIn(['2W', '1M'])
  ],
  validateRequest,
  etfController.getETFFlows
);

// ========== ESSENTIAL UTILITY ENDPOINTS ==========

// Authentication routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

// Cache management routes
const cacheService = require('../services/cache/cacheService');

router.delete('/cache', async (req, res) => {
  try {
    await cacheService.flush();
    res.json({ success: true, message: 'All cache cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to clear cache: ${error.message}` });
  }
});

router.delete('/cache/:key', async (req, res) => {
  try {
    await cacheService.del(req.params.key);
    res.json({ success: true, message: `Cache key ${req.params.key} cleared` });
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to clear cache key: ${error.message}` });
  }
});

// ETF cache specific clearing
router.delete('/cache/etf/flows', async (req, res) => {
  try {
    // Get current day period for cache key calculation
    const dayPeriod = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

    // Clear all ETF flows cache keys
    const keysToDelete = [
      `etf_flows_2W_${dayPeriod}`,
      `etf_flows_1M_${dayPeriod}`,
      `etf_flows_2W_${dayPeriod - 1}`, // Previous day as well
      `etf_flows_1M_${dayPeriod - 1}`,
      'etf_flows_fallback',
      `etf_flows_2W_${dayPeriod}_fallback`,
      `etf_flows_1M_${dayPeriod}_fallback`
    ];

    // Clear individual ETF caches too
    const etfSymbols = ['IBIT', 'FBTC', 'GBTC', 'BITB', 'ARKB'];
    etfSymbols.forEach(symbol => {
      keysToDelete.push(`etf_${symbol}_${dayPeriod}`);
      keysToDelete.push(`etf_${symbol}_${dayPeriod - 1}`);
    });

    let deletedCount = 0;
    for (const key of keysToDelete) {
      const deleted = await cacheService.del(key);
      if (deleted) deletedCount++;
    }

    res.json({
      success: true,
      message: `ETF flows cache cleared`,
      keysAttempted: keysToDelete.length,
      keysDeleted: deletedCount,
      clearedKeys: keysToDelete
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to clear ETF cache: ${error.message}` });
  }
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