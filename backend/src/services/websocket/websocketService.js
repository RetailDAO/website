const WebSocket = require('ws');
const cacheService = require('../cache/cacheService');

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isConnected = false;
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
  }
}

module.exports = new WebSocketService();