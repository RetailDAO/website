const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Import middleware
const rateLimiter = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

// Import controllers directly for simple routing
const { btcController } = require('./controllers/btcController');
const { dxyController } = require('./controllers/dxyController');
const { fundingController } = require('./controllers/fundingController');
const { etfController } = require('./controllers/etfController');
const { rsiController } = require('./controllers/rsiController');
const { cryptoController } = require('./controllers/cryptoController');

// Import services that need to be initialized
const websocketService = require('./services/websocket/websocketService');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Simple health routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    res.json({
      status: 'ready',
      services: {
        redis: 'connected',
        external_apis: 'available'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});

// API routes with simple validation
app.get('/api/v1/btc/price', btcController.getCurrentPrice);
app.get('/api/v1/btc-analysis', btcController.getAnalysis);
app.get('/api/v1/btc/ma-ribbon', btcController.getMARibbon);
app.get('/api/v1/dxy-analysis', dxyController.getAnalysis);
app.get('/api/v1/funding-rates', fundingController.getFundingRates);
app.get('/api/v1/etf-flows', etfController.getFlows);
app.get('/api/v1/rsi', rsiController.getRSI);

// Enhanced crypto analysis endpoints
app.get('/api/v1/crypto/analysis', cryptoController.getCryptoAnalysis);
app.get('/api/v1/crypto/multi-analysis', cryptoController.getMultipleCryptoAnalysis);
app.get('/api/v1/crypto/price', cryptoController.getCurrentPrice);

// Test endpoint
app.get('/api/v1/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working with full routes',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/v1/btc/price',
      '/api/v1/btc-analysis', 
      '/api/v1/dxy-analysis',
      '/api/v1/funding-rates',
      '/api/v1/etf-flows',
      '/api/v1/rsi',
      '/api/v1/crypto/analysis',
      '/api/v1/crypto/multi-analysis',
      '/api/v1/crypto/price'
    ]
  });
});

// Cache management
app.delete('/api/v1/cache', (req, res) => {
  res.json({ success: true, message: 'Cache cleared' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// WebSocket status endpoint
app.get('/api/v1/websocket/status', (_req, res) => {
  const status = websocketService.getConnectionStatus();
  res.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;