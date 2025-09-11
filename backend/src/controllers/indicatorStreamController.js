const WebSocket = require('ws');
const { calculateRSI, calculateMovingAverage, calculateEMA, calculateBollingerBands, calculateMACD } = require('../utils/technical_indicators');
const { CryptoDataService } = require('../services/dataProviders/cryptoDataservice');

class IndicatorStreamController {
  constructor() {
    this.clients = new Set();
    this.isStreaming = false;
    this.streamingInterval = null;
    this.cryptoService = new CryptoDataService();
    this.lastPriceData = new Map(); // Store last prices for each symbol
  }

  /**
   * Handle new WebSocket connection for indicator streaming
   * @param {WebSocket} ws - WebSocket connection
   * @param {Request} req - HTTP request object
   */
  handleIndicatorWebSocket(ws) {
    console.log('📊 New indicator streaming client connected');
    this.clients.add(ws);

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      availableIndicators: ['rsi', 'sma', 'ema', 'bollinger', 'macd'],
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📊 Indicator WebSocket message received:', data);
        
        this.handleClientMessage(ws, data);
      } catch (parseError) {
        console.error('❌ Error parsing indicator WebSocket message:', parseError);
        const errorResponse = {
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      console.log('📊 Indicator streaming client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ Indicator WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle client messages for indicator streaming
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Parsed message data
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
    case 'subscribe':
      this.handleSubscription(ws, data);
      break;
      
    case 'unsubscribe':
      this.handleUnsubscription(ws, data);
      break;
      
    case 'get_indicators':
      this.handleIndicatorRequest(ws, data);
      break;
      
    case 'ping': {
      const pong = {
        type: 'pong',
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(pong));
      break;
    }
      
    default: {
      console.warn(`⚠️ Unknown message type in indicator WebSocket: ${data.type}`);
      const errorResponse = {
        type: 'error',
        message: `Message type '${data.type}' is not supported`,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorResponse));
      break;
    }
    }
  }

  /**
   * Handle subscription requests
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Subscription data
   */
  handleSubscription(ws, data) {
    const { symbols = ['BTCUSDT'], indicators = ['rsi'] } = data;
    
    // Store subscription info on the WebSocket
    ws.subscription = {
      symbols,
      indicators,
      subscribed: true
    };

    const response = {
      type: 'subscription_confirmed',
      symbols,
      indicators,
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(response));
    console.log(`✅ Indicator subscription confirmed for symbols: ${symbols}, indicators: ${indicators}`);
  }

  /**
   * Handle unsubscription requests
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Unsubscription data
   */
  handleUnsubscription(ws) {
    if (ws.subscription) {
      ws.subscription.subscribed = false;
      delete ws.subscription;
    }

    const response = {
      type: 'unsubscription_confirmed',
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(response));
    console.log('✅ Client unsubscribed from indicator streaming');
  }

  /**
   * Handle direct indicator calculation requests
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Indicator request data
   */
  async handleIndicatorRequest(ws, data) {
    try {
      const { symbol = 'BTCUSDT', indicators = ['rsi'], timeframe = '1D' } = data;
      
      // Get historical data for calculations
      const cryptoData = await this.cryptoService.getBTCData(timeframe);
      const prices = cryptoData.historical.map(item => item.price);
      
      const calculatedIndicators = await this.calculateIndicators(prices, indicators);
      
      const response = {
        type: 'indicators',
        symbol,
        timeframe,
        indicators: calculatedIndicators,
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(response));
      
    } catch (error) {
      console.error('❌ Error calculating indicators:', error);
      const errorResponse = {
        type: 'error',
        message: 'Failed to calculate indicators',
        details: error.message,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Calculate requested indicators
   * @param {number[]} prices - Array of price data
   * @param {string[]} indicators - Array of indicator names
   * @returns {Object} Calculated indicators
   */
  async calculateIndicators(prices, indicators) {
    const results = {};
    
    for (const indicator of indicators) {
      try {
        switch (indicator.toLowerCase()) {
        case 'rsi':
          results.rsi = {
            values: calculateRSI(prices, 14),
            period: 14,
            latest: null
          };
          if (results.rsi.values.length > 0) {
            results.rsi.latest = results.rsi.values[results.rsi.values.length - 1];
          }
          break;
          
        case 'sma':
        case 'ma':
          results.sma = {
            sma20: calculateMovingAverage(prices, 20),
            sma50: calculateMovingAverage(prices, 50),
            sma200: calculateMovingAverage(prices, 200),
            latest: {}
          };
          // Get latest values
          if (results.sma.sma20.length > 0) results.sma.latest.sma20 = results.sma.sma20[results.sma.sma20.length - 1];
          if (results.sma.sma50.length > 0) results.sma.latest.sma50 = results.sma.sma50[results.sma.sma50.length - 1];
          if (results.sma.sma200.length > 0) results.sma.latest.sma200 = results.sma.sma200[results.sma.sma200.length - 1];
          break;
          
        case 'ema':
          results.ema = {
            ema12: calculateEMA(prices, 12),
            ema26: calculateEMA(prices, 26),
            latest: {}
          };
          // Get latest values
          if (results.ema.ema12.length > 0) results.ema.latest.ema12 = results.ema.ema12[results.ema.ema12.length - 1];
          if (results.ema.ema26.length > 0) results.ema.latest.ema26 = results.ema.ema26[results.ema.ema26.length - 1];
          break;
          
        case 'bollinger':
        case 'bb': {
          const bollinger = calculateBollingerBands(prices, 20, 2);
          results.bollinger = {
            ...bollinger,
            latest: {}
          };
          // Get latest values
          if (bollinger.upper.length > 0) {
            results.bollinger.latest = {
              upper: bollinger.upper[bollinger.upper.length - 1],
              middle: bollinger.middle[bollinger.middle.length - 1],
              lower: bollinger.lower[bollinger.lower.length - 1]
            };
          }
          break;
        }
          
        case 'macd': {
          const macd = calculateMACD(prices, 12, 26, 9);
          results.macd = {
            ...macd,
            latest: {}
          };
          // Get latest values
          if (macd.macd.length > 0) {
            results.macd.latest = {
              macd: macd.macd[macd.macd.length - 1],
              signal: macd.signal[macd.signal.length - 1],
              histogram: macd.histogram[macd.histogram.length - 1]
            };
          }
          break;
        }
          
        default:
          console.warn(`⚠️ Unknown indicator requested: ${indicator}`);
          break;
        }
      } catch (error) {
        console.error(`❌ Error calculating ${indicator}:`, error);
        results[indicator] = {
          error: `Failed to calculate ${indicator}: ${error.message}`
        };
      }
    }
    
    return results;
  }

  /**
   * Initialize streaming service
   */
  async initializeStreaming() {
    if (this.isStreaming) {
      console.log('📊 Indicator streaming already running');
      return;
    }

    console.log('🚀 Starting indicator streaming service...');
    this.isStreaming = true;

    // Start periodic indicator updates every 30 seconds
    this.streamingInterval = setInterval(async () => {
      if (this.clients.size > 0) {
        await this.broadcastIndicatorUpdates();
      }
    }, 30000); // 30 seconds

    console.log('✅ Indicator streaming service started successfully');
  }

  /**
   * Broadcast indicator updates to all subscribed clients
   */
  async broadcastIndicatorUpdates() {
    if (this.clients.size === 0) return;

    try {
      // Get fresh price data for BTC
      const btcData = await this.cryptoService.getBTCData('1D');
      const prices = btcData.historical.map(item => item.price);
      
      // Calculate indicators for subscribers
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN && client.subscription?.subscribed) {
          const { symbols = ['BTCUSDT'], indicators = ['rsi'] } = client.subscription;
          
          for (const symbol of symbols) {
            try {
              const calculatedIndicators = await this.calculateIndicators(prices, indicators);
              
              const update = {
                type: 'indicator_update',
                symbol,
                indicators: calculatedIndicators,
                timestamp: new Date().toISOString()
              };
              
              client.send(JSON.stringify(update));
            } catch (error) {
              console.error(`❌ Error sending indicator update for ${symbol}:`, error);
            }
          }
        } else if (client.readyState !== WebSocket.OPEN) {
          // Clean up closed connections
          this.clients.delete(client);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in indicator broadcast:', error);
    }
  }

  /**
   * Shutdown the streaming service
   */
  shutdown() {
    console.log('🛑 Shutting down indicator streaming service...');
    
    this.isStreaming = false;
    
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    
    // Close all client connections
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'shutdown',
          message: 'Server is shutting down',
          timestamp: new Date().toISOString()
        }));
        client.close();
      }
    }
    
    this.clients.clear();
    console.log('✅ Indicator streaming service shutdown complete');
  }

  /**
   * Get streaming status
   * @returns {Object} Current status information
   */
  getStatus() {
    return {
      isStreaming: this.isStreaming,
      connectedClients: this.clients.size,
      hasInterval: !!this.streamingInterval
    };
  }
}

// Create singleton instance
const indicatorStreamController = new IndicatorStreamController();

module.exports = {
  indicatorStreamController,
  IndicatorStreamController
};