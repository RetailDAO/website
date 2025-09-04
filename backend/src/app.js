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
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL?.replace(/\/$/, ''), // Remove trailing slash
      process.env.FRONTEND_URL?.replace(/([^/])$/, '$1/'), // Add trailing slash if not present
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://retaildao-terminal.vercel.app'
    ].filter(Boolean); // Remove undefined values
    
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      console.log(`🔍 Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count']
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Routes
// Root route for Railway deployment verification
app.get('/', (_, res) => {
  res.json({
    message: 'RetailDAO Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      websockets: ['/ws/prices', '/ws/indicators']
    }
  });
});

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
  // FIX: Reduce delay for faster WebSocket availability
  setTimeout(() => {
    console.log('🚀 Initializing WebSocket connections...');
    websocketService.connectToBinance();
    
    // Start indicator streaming for main symbols immediately after WebSocket connects
    setTimeout(() => {
      console.log('📊 Starting indicator streaming...');
      websocketService.startIndicatorStreaming('BTCUSDT');
      websocketService.startIndicatorStreaming('ETHUSDT');  
      websocketService.startIndicatorStreaming('SOLUSDT');
    }, 2000);
    
    console.log('🚀 Initializing scheduled tasks...');
    try {
      cronJobService.initializeJobs();
    } catch (error) {
      console.error('⚠️ Cron job initialization failed, continuing without scheduled tasks:', error.message);
    }
  }, 2000); // Reduced from 5s to 2s for faster initialization
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

module.exports = app;