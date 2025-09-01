const websocketService = require('../services/websocket/websocketService');
const cacheService = require('../services/cache/cacheService');
const { v4: uuidv4 } = require('uuid');

class IndicatorStreamController {
  constructor() {
    this.isStreamingActive = false;
    this.supportedSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  }

  // Initialize indicator streaming for all supported symbols
  async initializeStreaming() {
    if (this.isStreamingActive) {
      console.log('⚠️ Indicator streaming already active');
      return;
    }

    try {
      console.log('🚀 Initializing indicator streaming...');
      
      // Connect to Binance for real-time price data
      websocketService.connectToBinance();
      
      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start indicator streaming for each symbol
      for (const symbol of this.supportedSymbols) {
        websocketService.startIndicatorStreaming(symbol);
        // Stagger the start to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.isStreamingActive = true;
      console.log('✅ Indicator streaming initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing indicator streaming:', error);
      throw error;
    }
  }

  // Handle WebSocket client connections for indicator streaming
  async handleIndicatorWebSocket(ws, req) {
    const clientId = uuidv4();
    
    try {
      console.log(`👤 New client connected for indicator streaming: ${clientId}`);
      
      // Register the client for indicator broadcasts
      websocketService.registerClient(ws, clientId);
      
      // Send welcome message
      const welcomeMessage = {
        type: 'connection_established',
        clientId: clientId,
        supportedSymbols: this.supportedSymbols,
        timestamp: new Date().toISOString(),
        message: 'Connected to RetailDAO indicator streaming'
      };
      
      ws.send(JSON.stringify(welcomeMessage));
      
      // Handle client messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleClientMessage(ws, clientId, data);
        } catch (parseError) {
          console.error(`❌ Error parsing message from client ${clientId}:`, parseError);
          const errorMessage = {
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(errorMessage));
        }
      });
      
      // Handle client disconnection
      ws.on('close', () => {
        console.log(`👤 Client ${clientId} disconnected from indicator streaming`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
      });
      
    } catch (error) {
      console.error('❌ Error handling indicator WebSocket connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  // Handle messages from clients
  async handleClientMessage(ws, clientId, data) {
    try {
      switch (data.type) {
        case 'subscribe_symbol':
          await this.handleSymbolSubscription(ws, clientId, data);
          break;
          
        case 'unsubscribe_symbol':
          await this.handleSymbolUnsubscription(ws, clientId, data);
          break;
          
        case 'get_current_indicators':
          await this.handleGetCurrentIndicators(ws, clientId, data);
          break;
          
        case 'ping':
          const pongMessage = {
            type: 'pong',
            timestamp: new Date().toISOString(),
            clientId: clientId
          };
          ws.send(JSON.stringify(pongMessage));
          break;
          
        default:
          const errorMessage = {
            type: 'error',
            message: `Unknown message type: ${data.type}`,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(errorMessage));
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling client message from ${clientId}:`, error);
      const errorMessage = {
        type: 'error',
        message: 'Error processing request',
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorMessage));
    }
  }

  // Handle symbol subscription requests
  async handleSymbolSubscription(ws, clientId, data) {
    const { symbol } = data;
    
    if (!this.supportedSymbols.includes(symbol)) {
      const errorMessage = {
        type: 'error',
        message: `Unsupported symbol: ${symbol}. Supported symbols: ${this.supportedSymbols.join(', ')}`,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorMessage));
      return;
    }

    // Send current cached indicators for the symbol
    const cachedIndicators = await websocketService.getCurrentIndicators(symbol);
    if (cachedIndicators) {
      const message = {
        type: 'indicator_update',
        symbol: symbol,
        data: cachedIndicators,
        cached: true,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(message));
    }

    const confirmMessage = {
      type: 'subscription_confirmed',
      symbol: symbol,
      clientId: clientId,
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(confirmMessage));
    
    console.log(`📡 Client ${clientId} subscribed to ${symbol} indicators`);
  }

  // Handle symbol unsubscription requests  
  async handleSymbolUnsubscription(ws, clientId, data) {
    const { symbol } = data;
    
    const confirmMessage = {
      type: 'unsubscription_confirmed',
      symbol: symbol,
      clientId: clientId,
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(confirmMessage));
    
    console.log(`📡 Client ${clientId} unsubscribed from ${symbol} indicators`);
  }

  // Handle requests for current indicators
  async handleGetCurrentIndicators(ws, clientId, data) {
    const { symbol } = data;
    
    if (symbol && !this.supportedSymbols.includes(symbol)) {
      const errorMessage = {
        type: 'error',
        message: `Unsupported symbol: ${symbol}`,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorMessage));
      return;
    }

    if (symbol) {
      // Get indicators for specific symbol
      const indicators = await websocketService.getCurrentIndicators(symbol);
      const message = {
        type: 'current_indicators',
        symbol: symbol,
        data: indicators,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(message));
    } else {
      // Get indicators for all symbols
      for (const supportedSymbol of this.supportedSymbols) {
        const indicators = await websocketService.getCurrentIndicators(supportedSymbol);
        if (indicators) {
          const message = {
            type: 'current_indicators',
            symbol: supportedSymbol,
            data: indicators,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(message));
        }
      }
    }
  }

  // REST endpoint to get streaming status
  getStreamingStatus = async (req, res) => {
    try {
      const connectionStatus = websocketService.getConnectionStatus();
      const clientCount = websocketService.clientConnections?.size || 0;
      
      const status = {
        streaming: {
          active: this.isStreamingActive,
          supportedSymbols: this.supportedSymbols,
          connectedClients: clientCount,
          updateInterval: websocketService.indicatorUpdateInterval || 300000
        },
        binanceConnection: {
          connected: connectionStatus.isConnected,
          activeConnections: connectionStatus.activeConnections,
          reconnectAttempts: connectionStatus.reconnectAttempts
        },
        indicators: {}
      };

      // Get current indicator data for each symbol
      for (const symbol of this.supportedSymbols) {
        const indicators = await websocketService.getCurrentIndicators(symbol);
        status.indicators[symbol] = {
          available: !!indicators,
          lastUpdate: indicators?.timestamp,
          dataPoints: indicators?.dataPoints || 0
        };
      }

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error getting streaming status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get streaming status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // REST endpoint to start/stop streaming for specific symbols
  controlStreaming = async (req, res) => {
    try {
      const { action, symbol } = req.body;
      
      if (!['start', 'stop'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use "start" or "stop"'
        });
      }

      if (symbol && !this.supportedSymbols.includes(symbol)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported symbol: ${symbol}. Supported: ${this.supportedSymbols.join(', ')}`
        });
      }

      if (action === 'start') {
        if (symbol) {
          websocketService.startIndicatorStreaming(symbol);
        } else {
          await this.initializeStreaming();
        }
      } else if (action === 'stop') {
        if (symbol) {
          websocketService.stopIndicatorStreaming(symbol);
        } else {
          // Stop all streaming
          for (const supportedSymbol of this.supportedSymbols) {
            websocketService.stopIndicatorStreaming(supportedSymbol);
          }
          this.isStreamingActive = false;
        }
      }

      res.json({
        success: true,
        message: `Successfully ${action}ed streaming${symbol ? ` for ${symbol}` : ''}`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error controlling streaming:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to control streaming',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // REST endpoint to get cached indicators
  getCachedIndicators = async (req, res) => {
    try {
      const { symbol } = req.params;
      
      if (symbol && !this.supportedSymbols.includes(symbol.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Unsupported symbol: ${symbol}. Supported: ${this.supportedSymbols.join(', ')}`
        });
      }

      if (symbol) {
        // Get specific symbol indicators
        const indicators = await websocketService.getCurrentIndicators(symbol.toUpperCase());
        
        res.json({
          success: true,
          data: indicators,
          symbol: symbol.toUpperCase(),
          timestamp: new Date().toISOString()
        });
      } else {
        // Get all symbols indicators
        const allIndicators = {};
        
        for (const supportedSymbol of this.supportedSymbols) {
          const indicators = await websocketService.getCurrentIndicators(supportedSymbol);
          if (indicators) {
            allIndicators[supportedSymbol] = indicators;
          }
        }
        
        res.json({
          success: true,
          data: allIndicators,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Error getting cached indicators:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cached indicators',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔌 Shutting down indicator streaming...');
    
    for (const symbol of this.supportedSymbols) {
      websocketService.stopIndicatorStreaming(symbol);
    }
    
    this.isStreamingActive = false;
    console.log('✅ Indicator streaming shutdown complete');
  }
}

const indicatorStreamController = new IndicatorStreamController();

module.exports = { indicatorStreamController };