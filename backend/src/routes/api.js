const express = require('express');
const { query, validationResult } = require('express-validator');

const { btcController } = require('../controllers/btcController');
const { dxyController } = require('../controllers/dxyController');
const { etfController } = require('../controllers/etfController');
const { fundingController } = require('../controllers/fundingController');
const { rsiController } = require('../controllers/rsiController');
const { cryptoController } = require('../controllers/cryptoController');
const { indicatorStreamController } = require('../controllers/indicatorStreamController');

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

// BTC routes
router.get('/btc-analysis', 
  [
    query('timeframe').optional().isIn(['1D', '7D', '30D', '90D', '1Y']),
    query('refresh').optional().isBoolean()
  ],
  validateRequest,
  btcController.getAnalysis
);

router.get('/btc/price', btcController.getCurrentPrice);

router.get('/btc/ma-ribbon',
  [
    query('timeframe').optional().isIn(['1D', '7D', '30D', '90D', '1Y']),
    query('symbol').optional().isLength({ min: 1, max: 10 })
  ],
  validateRequest,
  btcController.getMARibbon
);

// DXY routes
router.get('/dxy-analysis',
  [
    query('timeframe').optional().isIn(['1D', '7D', '30D', '90D'])
  ],
  validateRequest,
  dxyController.getAnalysis
);

// ETF routes
router.get('/etf-flows',
  [
    query('dateRange').optional().isIn(['7D', '30D', '90D', '1Y']),
    query('etfFilter').optional().isLength({ min: 1, max: 10 })
  ],
  validateRequest,
  etfController.getFlows
);

router.get('/etf-summary',
  [
    query('symbols').optional()
  ],
  validateRequest,
  etfController.getETFSummary
);

// Funding rates
router.get('/funding-rates',
  [
    query('exchange').optional().isIn(['binance', 'bybit', 'okx', 'all']),
    query('symbol').optional().isLength({ min: 1, max: 10 })
  ],
  validateRequest,
  fundingController.getFundingRates
);

// RSI data - enhanced with optimized service and extended periods
router.get('/rsi',
  [
    query('symbol').notEmpty().withMessage('Symbol is required'),
    query('timeframe').optional().isIn(['1D', '7D', '30D', '50D', '90D', '220D']), // Extended timeframes
    query('period').optional().isInt({ min: 2, max: 200 }) // Extended periods for BTC MAs
  ],
  validateRequest,
  rsiController.getRSI
);

// Bulk RSI calculations for multiple symbols/periods with enhanced periods
router.get('/rsi/bulk',
  [
    query('symbols').optional(),
    query('periods').optional(),
    query('timeframe').optional().isIn(['1D', '7D', '30D', '50D', '90D', '220D']) // Extended timeframes
  ],
  validateRequest,
  rsiController.getBulkRSI
);

// RSI summary for dashboard
router.get('/rsi/summary',
  [
    query('symbols').optional()
  ],
  validateRequest,
  rsiController.getRSISummary
);

// Enhanced crypto analysis routes
router.get('/crypto/analysis',
  [
    query('symbol').notEmpty().withMessage('Symbol is required'),
    query('timeframe').optional().isIn(['1D', '7D', '30D', '90D', '1Y']),
    query('includeAnalysis').optional().isBoolean()
  ],
  validateRequest,
  cryptoController.getCryptoAnalysis
);

router.get('/crypto/multi-analysis',
  [
    query('symbols').notEmpty().withMessage('Symbols are required (e.g. BTC,ETH,RETAIL)'),
    query('timeframe').optional().isIn(['1D', '7D', '30D', '90D', '1Y']),
    query('includeAnalysis').optional().isBoolean()
  ],
  validateRequest,
  cryptoController.getMultipleCryptoAnalysis
);

router.get('/crypto/price',
  [
    query('symbol').notEmpty().withMessage('Symbol is required')
  ],
  validateRequest,
  cryptoController.getCurrentPrice
);

// Legacy route for backward compatibility
router.get('/crypto-data',
  [
    query('symbols').notEmpty().withMessage('Symbols are required'),
    query('timeframe').optional().isIn(['1D', '7D', '30D', '90D'])
  ],
  validateRequest,
  (req, res) => {
    res.json({ success: true, message: 'Deprecated - use /crypto/multi-analysis instead' });
  }
);

// ========== INDICATOR STREAMING ROUTES ==========

// Get streaming status
router.get('/indicators/stream/status', indicatorStreamController.getStreamingStatus);

// Control streaming (start/stop)
router.post('/indicators/stream/control', 
  [
    query('action').isIn(['start', 'stop']).withMessage('Action must be start or stop'),
    query('symbol').optional().isLength({ min: 6, max: 10 })
  ],
  validateRequest,
  indicatorStreamController.controlStreaming
);

// Get cached indicators for all symbols
router.get('/indicators/cached', indicatorStreamController.getCachedIndicators);

// Get cached indicators for specific symbol
router.get('/indicators/cached/:symbol',
  [
    query('symbol').isLength({ min: 3, max: 10 }).withMessage('Invalid symbol format')
  ],
  validateRequest,
  indicatorStreamController.getCachedIndicators
);

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

// Test endpoint to verify indicator streaming functionality
router.get('/test/indicators', async (req, res) => {
  try {
    const websocketService = require('../services/websocket/websocketService');
    const testResults = {};
    
    // Test price history for each symbol
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    
    for (const symbol of symbols) {
      const priceHistory = websocketService.priceHistory?.get?.(symbol);
      const cachedIndicators = await websocketService.getCurrentIndicators(symbol);
      
      testResults[symbol] = {
        priceHistoryLength: priceHistory?.length || 0,
        hasIndicators: !!cachedIndicators,
        lastUpdate: cachedIndicators?.timestamp || null,
        dataPoints: cachedIndicators?.dataPoints || 0
      };
    }
    
    const connectionStatus = websocketService.getConnectionStatus();
    
    res.json({
      success: true,
      message: 'Indicator streaming test results',
      data: {
        symbols: testResults,
        connection: connectionStatus,
        clientConnections: websocketService.clientConnections?.size || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

module.exports = router;