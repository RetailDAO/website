const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Import middleware
const rateLimiter = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const apiRoutes = require('./routes/api');

// Import services that need to be initialized
const websocketService = require('./services/websocket/websocketService');
const cronJobService = require('./services/scheduler/cronJobs');

const app = express();

// Trust proxy for rate limiting accuracy in production
app.set('trust proxy', true);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Routes
// Simple health check for Railway deployment
app.get('/health', (_, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RetailDAO Backend'
  });
});

app.use('/api/v1', apiRoutes);

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

// Initialize services for real-time data and scheduled tasks
if (process.env.NODE_ENV !== 'test') {
  console.log('🚀 Initializing WebSocket connections...');
  websocketService.connectToBinance();
  
  console.log('🚀 Initializing scheduled tasks...');
  try {
    cronJobService.initializeJobs();
  } catch (error) {
    console.error('⚠️ Cron job initialization failed, continuing without scheduled tasks:', error.message);
  }
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('📡 Closing WebSocket connections...');
    websocketService.closeAllConnections();
    console.log('⏹️ Stopping scheduled tasks...');
    cronJobService.stopAllJobs();
  });
  
  process.on('SIGINT', () => {
    console.log('📡 Closing WebSocket connections...');
    websocketService.closeAllConnections();
    console.log('⏹️ Stopping scheduled tasks...');
    cronJobService.stopAllJobs();
    process.exit(0);
  });
}

module.exports = app;