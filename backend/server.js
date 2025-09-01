require('dotenv').config();
const app = require('./src/app_fixed');
const WebSocket = require('ws');
const websocketService = require('./src/services/websocket/websocketService');
const { indicatorStreamController } = require('./src/controllers/indicatorStreamController');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Crypto Dashboard API v${process.env.npm_package_version}`);
});

// WebSocket Server for real-time price updates
const wss = new WebSocket.Server({ 
  server,
  path: '/ws/prices'
});

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket client connected');
  clients.add(ws);

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
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

// WebSocket Server for indicator streaming
const indicatorWss = new WebSocket.Server({ 
  server,
  path: '/ws/indicators'
});

indicatorWss.on('connection', (ws, req) => {
  console.log('📊 New indicator streaming client connected');
  indicatorStreamController.handleIndicatorWebSocket(ws, req);
});

console.log('📊 Indicator streaming WebSocket server initialized on /ws/indicators');

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