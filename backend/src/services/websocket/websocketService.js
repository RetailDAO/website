const WebSocket = require('ws');
const cacheService = require('../cache/cacheService');
const { calculateRSI, calculateMovingAverage } = require('../../utils/technical_indicators');

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isConnected = false;
    
    // Indicator streaming properties
    this.clientConnections = new Map(); // Track client WebSocket connections
    this.indicatorIntervals = new Map(); // Track indicator calculation intervals
    this.lastIndicatorData = new Map(); // Cache last calculated indicators for comparison
    
    // Streaming configuration
    this.indicatorUpdateInterval = 5 * 60 * 1000; // 5 minutes
    this.priceHistoryLimit = 250; // Keep 250 data points for MA calculations
    this.priceHistory = new Map(); // Store price history per symbol
  }

  // Binance WebSocket connection for BTC/ETH/SOL real-time prices
  connectToBinance() {
    const streams = [
      'btcusdt@ticker',
      'ethusdt@ticker',
      'solusdt@ticker',
      'btcusdt@kline_1m',
      'solusdt@kline_1m'
    ];
    
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;
    
    return this.createConnection('binance', wsUrl, (data) => {
      this.handleBinanceData(data);
    });
  }

  createConnection(name, url, messageHandler) {
    if (this.connections.has(name)) {
      const existingWs = this.connections.get(name);
      if (existingWs.readyState === WebSocket.CONNECTING || existingWs.readyState === WebSocket.OPEN) {
        console.log(`⚠️ ${name} connection already exists and is active, skipping`);
        return existingWs;
      }
      console.log(`⚠️ Closing existing ${name} connection`);
      existingWs.close();
      this.connections.delete(name);
    }

    console.log(`🔌 Connecting to ${name} WebSocket: ${url}`);
    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`✅ Connected to ${name} WebSocket`);
      this.isConnected = true;
      this.reconnectAttempts.set(name, 0);
      this.connections.set(name, ws);
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data);
        messageHandler(parsed);
      } catch (error) {
        console.error(`❌ Error parsing ${name} message:`, error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`❌ ${name} WebSocket closed:`, code, reason.toString());
      this.isConnected = false;
      this.connections.delete(name);
      this.scheduleReconnect(name, url, messageHandler);
    });

    ws.on('error', (error) => {
      console.error(`❌ ${name} WebSocket error:`, error);
      this.isConnected = false;
    });

    return ws;
  }

  scheduleReconnect(name, url, messageHandler) {
    const attempts = this.reconnectAttempts.get(name) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for ${name} (${attempts} attempts)`);
      this.reconnectAttempts.delete(name);
      return;
    }

    // Exponential backoff with jitter to prevent thundering herd
    const baseDelay = this.reconnectDelay * Math.pow(2, attempts);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
    
    console.log(`🔄 Reconnecting to ${name} in ${Math.round(delay)}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      // Check if we should still reconnect
      if (!this.connections.has(name) || this.connections.get(name).readyState !== WebSocket.OPEN) {
        this.reconnectAttempts.set(name, attempts + 1);
        this.createConnection(name, url, messageHandler);
      }
    }, delay);
  }

  async handleBinanceData(data) {
    try {
      if (data.stream) {
        const [symbol, type] = data.stream.split('@');
        
        if (type === 'ticker') {
          // Real-time price updates
          const priceData = {
            symbol: symbol.toUpperCase(),
            price: parseFloat(data.data.c),
            change24h: parseFloat(data.data.P),
            volume24h: parseFloat(data.data.v),
            timestamp: new Date().toISOString()
          };

          // Cache with tier1 (realtime) TTL
          await cacheService.setRealtime(`ws_price_${symbol}`, priceData);
          
          // Update price history for indicator calculations
          await this.updatePriceHistory(symbol.toUpperCase(), priceData.price, priceData.timestamp);
          
          console.log(`📈 Updated ${symbol.toUpperCase()}: $${priceData.price}`);
          
        } else if (type === 'kline_1m') {
          // OHLCV data for moving average calculations
          const klineData = data.data;
          if (klineData.x) { // Only process closed candles
            const ohlcvData = {
              symbol: symbol.toUpperCase(),
              open: parseFloat(klineData.o),
              high: parseFloat(klineData.h),
              low: parseFloat(klineData.l),
              close: parseFloat(klineData.c),
              volume: parseFloat(klineData.v),
              timestamp: new Date(klineData.T).toISOString()
            };

            await cacheService.setRealtime(`ws_ohlcv_${symbol}_1m`, ohlcvData);
            
            // Update price history with close price for more accurate indicators
            await this.updatePriceHistory(symbol.toUpperCase(), ohlcvData.close, ohlcvData.timestamp);
            
            console.log(`📊 New ${symbol.toUpperCase()} candle: $${ohlcvData.close}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling Binance data:', error);
    }
  }

  // Get real-time price from cache
  async getRealtimePrice(symbol) {
    const cacheKey = `ws_price_${symbol.toLowerCase()}usdt`;
    return await cacheService.get(cacheKey);
  }

  // Get latest OHLCV data
  async getLatestOHLCV(symbol) {
    const cacheKey = `ws_ohlcv_${symbol.toLowerCase()}usdt_1m`;
    return await cacheService.get(cacheKey);
  }

  // Health check
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      activeConnections: Array.from(this.connections.keys()),
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts)
    };
  }

  // Graceful shutdown
  closeAllConnections() {
    console.log('🔌 Closing all WebSocket connections...');
    this.connections.forEach((ws, name) => {
      console.log(`Closing ${name} connection`);
      ws.close();
    });
    this.connections.clear();
    this.reconnectAttempts.clear();
    
    // Clean up indicator intervals
    this.indicatorIntervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    this.indicatorIntervals.clear();
    
    // Close client connections
    this.clientConnections.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.clientConnections.clear();
  }

  // ========== INDICATOR STREAMING METHODS ==========

  // Update price history for indicator calculations
  async updatePriceHistory(symbol, price, timestamp) {
    try {
      if (!this.priceHistory.has(symbol)) {
        // Initialize with cached historical data if available
        await this.initializePriceHistory(symbol);
      }

      const history = this.priceHistory.get(symbol) || [];
      history.push({
        price: parseFloat(price),
        timestamp: timestamp
      });

      // Keep only the last 250 data points to manage memory
      if (history.length > this.priceHistoryLimit) {
        history.shift();
      }

      this.priceHistory.set(symbol, history);

      // Cache the updated history
      await cacheService.setRealtime(`ws_price_history_${symbol}`, history);
      
    } catch (error) {
      console.error(`❌ Error updating price history for ${symbol}:`, error);
    }
  }

  // Initialize price history from cached data
  async initializePriceHistory(symbol) {
    try {
      // Try to get cached history first
      const cachedHistory = await cacheService.get(`ws_price_history_${symbol}`);
      if (cachedHistory && Array.isArray(cachedHistory)) {
        this.priceHistory.set(symbol, cachedHistory);
        console.log(`📊 Initialized ${symbol} price history from cache (${cachedHistory.length} points)`);
        return;
      }

      // If no cached history, try to get from crypto data service
      const { CryptoDataService } = require('../dataProviders/cryptoDataservice');
      const cryptoDataService = new CryptoDataService();
      
      try {
        // Convert WebSocket symbol to API symbol (BTCUSDT -> BTC)
        const apiSymbol = symbol.replace('USDT', '');
        // Optimized: Only request 100 days for MAs (enough for 100-day MA + buffer)
        const cryptoData = await cryptoDataService.getCryptoData(apiSymbol, '100D');
        if (cryptoData.historical && cryptoData.historical.length > 0) {
          const history = cryptoData.historical.slice(-this.priceHistoryLimit).map(item => ({
            price: item.price,
            timestamp: item.timestamp
          }));
          
          this.priceHistory.set(symbol, history);
          await cacheService.setRealtime(`ws_price_history_${symbol}`, history);
          console.log(`📊 Initialized ${symbol} price history from API (${history.length} points)`);
        }
      } catch (apiError) {
        console.warn(`⚠️ Could not initialize ${symbol} history from API:`, apiError.message);
        // Initialize with empty array
        this.priceHistory.set(symbol, []);
      }
      
    } catch (error) {
      console.error(`❌ Error initializing price history for ${symbol}:`, error);
      this.priceHistory.set(symbol, []);
    }
  }

  // Calculate and stream indicators for a symbol
  async calculateAndStreamIndicators(symbol) {
    try {
      const history = this.priceHistory.get(symbol);
      if (!history || history.length < 50) {
        console.log(`⚠️ Insufficient price data for ${symbol} indicators (${history?.length || 0} points)`);
        return null;
      }

      const prices = history.map(item => item.price);
      const timestamps = history.map(item => item.timestamp);
      
      // Calculate RSI for multiple periods
      const rsiData = {};
      [14, 21, 30].forEach(period => {
        const rsiValues = calculateRSI(prices, period);
        if (rsiValues.length > 0) {
          const currentRSI = rsiValues[rsiValues.length - 1];
          rsiData[period] = {
            current: Math.round(currentRSI * 100) / 100,
            timestamp: timestamps[timestamps.length - 1],
            status: currentRSI > 70 ? 'Overbought' : currentRSI < 30 ? 'Oversold' : 'Normal'
          };
        }
      });

      // Calculate Moving Averages
      const movingAverages = {};
      [20, 50, 100, 200].forEach(period => {
        if (prices.length >= period) {
          const maValues = calculateMovingAverage(prices, period);
          if (maValues.length > 0) {
            const currentMA = maValues[maValues.length - 1];
            const currentPrice = prices[prices.length - 1];
            
            movingAverages[period] = {
              current: Math.round(currentMA * 100) / 100,
              timestamp: timestamps[timestamps.length - 1],
              pricePosition: currentPrice > currentMA ? 'above' : 'below',
              deviation: Math.round(((currentPrice - currentMA) / currentMA) * 10000) / 100 // Percentage
            };
          }
        }
      });

      const indicatorData = {
        symbol: symbol,
        timestamp: new Date().toISOString(),
        rsi: rsiData,
        movingAverages: movingAverages,
        dataPoints: history.length
      };

      // Cache the indicators
      await cacheService.setFrequent(`ws_indicators_${symbol}`, indicatorData);
      
      // Always broadcast to subscribed clients for price card pulsing
      await this.broadcastIndicators(symbol, indicatorData);
      
      // Update last indicator data for comparison
      this.lastIndicatorData.set(symbol, indicatorData);
      
      console.log(`📊 Calculated and streamed indicators for ${symbol}`)

      return indicatorData;
      
    } catch (error) {
      console.error(`❌ Error calculating indicators for ${symbol}:`, error);
      return null;
    }
  }

  // Check if indicators have changed significantly
  async hasSignificantIndicatorChange(symbol, newData) {
    const lastData = this.lastIndicatorData.get(symbol);
    if (!lastData) return true; // First time, always broadcast

    try {
      // Check RSI changes (>2 points is significant)
      for (const period of [14, 21, 30]) {
        if (newData.rsi[period] && lastData.rsi[period]) {
          const rsiDiff = Math.abs(newData.rsi[period].current - lastData.rsi[period].current);
          if (rsiDiff > 2) return true;
        }
      }

      // Check MA changes (>1% is significant)
      for (const period of [20, 50, 100, 200]) {
        if (newData.movingAverages[period] && lastData.movingAverages[period]) {
          const maDiff = Math.abs(
            (newData.movingAverages[period].current - lastData.movingAverages[period].current) / 
            lastData.movingAverages[period].current
          );
          if (maDiff > 0.01) return true; // 1% change
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking indicator changes:', error);
      return true; // If error, err on the side of broadcasting
    }
  }

  // Broadcast indicators to subscribed clients
  async broadcastIndicators(symbol, indicatorData) {
    const message = {
      type: 'indicator_update',
      symbol: symbol,
      data: indicatorData
    };

    let broadcastCount = 0;
    this.clientConnections.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          broadcastCount++;
        } catch (error) {
          console.error(`❌ Error broadcasting to client ${clientId}:`, error);
          // Remove failed connection
          this.clientConnections.delete(clientId);
        }
      } else {
        // Clean up closed connections
        this.clientConnections.delete(clientId);
      }
    });

    if (broadcastCount > 0) {
      console.log(`📡 Broadcasted ${symbol} indicators to ${broadcastCount} clients`);
    }
  }

  // Start indicator calculations for a symbol
  startIndicatorStreaming(symbol) {
    const intervalKey = `indicators_${symbol}`;
    
    if (this.indicatorIntervals.has(intervalKey)) {
      console.log(`⚠️ Indicator streaming already running for ${symbol}`);
      return;
    }

    // Initialize price history
    this.initializePriceHistory(symbol);

    // Calculate indicators immediately
    setTimeout(() => {
      this.calculateAndStreamIndicators(symbol);
    }, 2000);

    // Set up regular interval
    const interval = setInterval(() => {
      this.calculateAndStreamIndicators(symbol);
    }, this.indicatorUpdateInterval);

    this.indicatorIntervals.set(intervalKey, interval);
    console.log(`🚀 Started indicator streaming for ${symbol} (every ${this.indicatorUpdateInterval / 1000}s)`);
  }

  // Stop indicator calculations for a symbol
  stopIndicatorStreaming(symbol) {
    const intervalKey = `indicators_${symbol}`;
    const interval = this.indicatorIntervals.get(intervalKey);
    
    if (interval) {
      clearInterval(interval);
      this.indicatorIntervals.delete(intervalKey);
      console.log(`⏹️ Stopped indicator streaming for ${symbol}`);
    }
  }

  // Register a client WebSocket connection for indicator streaming
  registerClient(ws, clientId) {
    this.clientConnections.set(clientId, ws);
    console.log(`👤 Registered client ${clientId} for indicator streaming`);

    // Send current cached indicators immediately
    this.sendCachedIndicators(ws);

    // Handle client disconnection
    ws.on('close', () => {
      this.clientConnections.delete(clientId);
      console.log(`👤 Client ${clientId} disconnected from indicator streaming`);
    });
  }

  // Send cached indicators to a specific client
  async sendCachedIndicators(ws) {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      
      for (const symbol of symbols) {
        const cached = await cacheService.get(`ws_indicators_${symbol}`);
        if (cached && ws.readyState === WebSocket.OPEN) {
          const message = {
            type: 'indicator_update',
            symbol: symbol,
            data: cached,
            cached: true
          };
          ws.send(JSON.stringify(message));
        }
      }
    } catch (error) {
      console.error('❌ Error sending cached indicators:', error);
    }
  }

  // Get current indicator data for a symbol
  async getCurrentIndicators(symbol) {
    return await cacheService.get(`ws_indicators_${symbol}`);
  }
}

module.exports = new WebSocketService();