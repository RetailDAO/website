require('dotenv').config();
const app = require('./src/app');
const WebSocket = require('ws');
const websocketService = require('./src/services/websocket/websocketService');
const { indicatorStreamController } = require('./src/controllers/indicatorStreamController');

const PORT = process.env.PORT || 3001;

// Ensure proper server configuration for WebSocket upgrade handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Crypto Dashboard API v${process.env.npm_package_version}`);
});

// WebSocket Server for real-time price updates - Create before upgrade handler
const wss = new WebSocket.Server({ 
  noServer: true, // Don't attach to server automatically - we'll handle upgrades manually
  verifyClient: (info) => {
    // Log connection attempts for debugging
    console.log(`🔍 WebSocket connection attempt to: ${info.req.url}`);
    console.log(`🔍 Headers:`, {
      upgrade: info.req.headers.upgrade,
      connection: info.req.headers.connection,
      'sec-websocket-version': info.req.headers['sec-websocket-version'],
      'sec-websocket-key': info.req.headers['sec-websocket-key']
    });
    return true; // Accept all valid WebSocket connections
  }
});

// WebSocket Server for indicator streaming - Create before upgrade handler
const indicatorWss = new WebSocket.Server({ 
  noServer: true, // Don't attach to server automatically - we'll handle upgrades manually
  verifyClient: (info) => {
    // Log connection attempts for debugging
    console.log(`🔍 Indicator WebSocket connection attempt to: ${info.req.url}`);
    console.log(`🔍 Headers:`, {
      upgrade: info.req.headers.upgrade,
      connection: info.req.headers.connection,
      'sec-websocket-version': info.req.headers['sec-websocket-version'],
      'sec-websocket-key': info.req.headers['sec-websocket-key']
    });
    return true; // Accept all valid WebSocket connections
  }
});

// Handle server upgrade events for WebSocket connections
server.on('upgrade', (request, socket, head) => {
  console.log(`⬆️ HTTP Upgrade request received for: ${request.url}`);
  console.log(`⬆️ Upgrade header: ${request.headers.upgrade}`);
  console.log(`⬆️ Connection header: ${request.headers.connection}`);
  
  // Let the WebSocket servers handle the upgrade
  if (request.url === '/ws/prices') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log('✅ Successfully upgraded to WebSocket for /ws/prices');
      wss.emit('connection', ws, request);
    });
  } else if (request.url === '/ws/indicators') {
    indicatorWss.handleUpgrade(request, socket, head, (ws) => {
      console.log('✅ Successfully upgraded to WebSocket for /ws/indicators');
      indicatorWss.emit('connection', ws, request);
    });
  } else {
    console.log(`❌ Unknown WebSocket path: ${request.url}`);
    socket.destroy();
  }
});

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket client connected to /ws/prices');
  clients.add(ws);

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Price WebSocket message received:', data);
      
      switch (data.type) {
        case 'subscribe':
          // For the price WebSocket, we don't need explicit subscription
          // All connected clients automatically receive price updates
          const response = {
            type: 'subscription_confirmed',
            symbols: data.symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(response));
          console.log('✅ Price subscription confirmed for symbols:', data.symbols);
          break;
          
        case 'ping':
          const pong = {
            type: 'pong',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pong));
          break;
          
        default:
          console.warn(`⚠️ Unknown message type in price WebSocket: ${data.type}`);
          const errorResponse = {
            type: 'error',
            message: `Price WebSocket: Message type '${data.type}' is not supported. All clients automatically receive price updates.`,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(errorResponse));
          break;
      }
    } catch (parseError) {
      console.error('❌ Error parsing price WebSocket message:', parseError);
      const errorResponse = {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorResponse));
    }
  });

  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected from /ws/prices');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast price updates to all connected clients
const broadcastPriceUpdate = (symbol, priceData) => {
  const message = JSON.stringify({
    type: 'price_update',
    symbol,
    ...priceData,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('❌ Error broadcasting to client:', error);
        clients.delete(client);
      }
    }
  });
};

// Start WebSocket data service and connect broadcaster
console.log('🚀 Starting Binance WebSocket connection...');
websocketService.connectToBinance();

// Override the WebSocket service's price handler to broadcast to clients
const originalHandler = websocketService.handleBinanceData.bind(websocketService);
websocketService.handleBinanceData = async function(data) {
  await originalHandler(data);
  
  // Broadcast price updates to connected clients
  if (data.stream) {
    const [symbol, type] = data.stream.split('@');
    
    if (type === 'ticker') {
      const priceData = {
        price: parseFloat(data.data.c),
        change24h: parseFloat(data.data.P),
        volume24h: parseFloat(data.data.v)
      };
      
      broadcastPriceUpdate(symbol.toUpperCase(), priceData);
    }
  }
};

console.log('📡 WebSocket server initialized on /ws/prices');

// ========== INDICATOR STREAMING WEBSOCKET SERVER ==========

indicatorWss.on('connection', (ws, req) => {
  console.log('📊 New indicator streaming client connected');
  indicatorStreamController.handleIndicatorWebSocket(ws, req);
});

console.log('📊 Indicator streaming WebSocket server initialized on /ws/indicators');

// ========== CACHE AND GOLDEN DATASET MAINTENANCE ==========

// Initialize cache maintenance
const cacheService = require('./src/services/cache/cacheService');

// Perform initial cache health check and setup
(async () => {
  try {
    const health = await cacheService.getEnhancedHealth();
    console.log('📋 Cache system health check:', health);
    
    // Setup periodic cache maintenance (every 30 minutes)
    setInterval(async () => {
      try {
        await cacheService.performMaintenance();
      } catch (error) {
        console.error('❌ Periodic cache maintenance failed:', error.message);
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    console.log('✅ Cache maintenance system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize cache maintenance:', error.message);
  }
})();

// Initialize indicator streaming on startup
setTimeout(async () => {
  try {
    console.log('🚀 Initializing indicator streaming...');
    await indicatorStreamController.initializeStreaming();
    console.log('✅ Indicator streaming started successfully');
  } catch (error) {
    console.error('❌ Failed to initialize indicator streaming:', error);
  }
}, 5000); // Wait 5 seconds for Binance connection to stabilize

// Global error handling to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', reason.stack);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  
  // Perform graceful shutdown
  console.log('🚨 Performing graceful shutdown due to uncaught exception...');
  
  try {
    indicatorStreamController.shutdown();
    websocketService.closeAllConnections();
  } catch (shutdownError) {
    console.error('❌ Error during shutdown:', shutdownError);
  }
  
  server.close(() => {
    console.log('Process terminated due to uncaught exception');
    process.exit(1);
  });
  
  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.log('⏰ Forced exit due to timeout');
    process.exit(1);
  }, 10000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Shutdown indicator streaming
  indicatorStreamController.shutdown();
  websocketService.closeAllConnections();
  
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  
  // Shutdown indicator streaming
  indicatorStreamController.shutdown();
  websocketService.closeAllConnections();
  
  process.exit(0);
});