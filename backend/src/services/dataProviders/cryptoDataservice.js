const axios = require('axios');
const config = require('../../config/environment');
const cacheService = require('../cache/cacheService');
const rateLimitedApi = require('../rateLimitedApi');
const websocketService = require('../websocket/websocketService');
// const { formatCryptoData } = require('../../utils/formatters');

class CryptoDataService {
  constructor() {
    this.coinGeckoClient = axios.create({
      baseURL: config.COINGECKO_BASE_URL,
      headers: {
        'X-CG-Pro-API-Key': config.COINGECKO_API_KEY,
        'accept': 'application/json'
      },
      timeout: 30000
    });

    this.binanceClient = axios.create({
      baseURL: config.BINANCE_BASE_URL,
      timeout: 15000
    });

    // Binance Futures client for more data sources
    this.binanceFuturesClient = axios.create({
      baseURL: 'https://fapi.binance.com/fapi',
      timeout: 15000
    });
  }

  async getBTCData(timeframe = '1D') {
    const cacheKey = `btc_data_${timeframe}`;
    
    // Try cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Try WebSocket real-time data first for current price
    let currentData = null;
    const wsPrice = await websocketService.getRealtimePrice('btc');
    if (wsPrice) {
      currentData = {
        bitcoin: {
          usd: wsPrice.price,
          usd_24h_change: wsPrice.change24h,
          usd_24h_vol: wsPrice.volume24h,
          usd_market_cap: wsPrice.price * 19700000 // Approximate BTC supply
        }
      };
      console.log('📡 Using WebSocket data for current BTC price');
    }

    try {
      // Get current price data with rate limiting (only if WebSocket data not available)
      if (!currentData) {
        currentData = await rateLimitedApi.coinGeckoRequest(async () => {
          const response = await this.coinGeckoClient.get('/simple/price', {
            params: {
              ids: 'bitcoin',
              vs_currencies: 'usd',
              include_24hr_change: true,
              include_24hr_vol: true,
              include_market_cap: true
            }
          });
          return response.data;
        });
        console.log('🌐 Using CoinGecko API for current BTC price');
      }

      // Get historical data with rate limiting - ensure we have enough for RSI/MA calculations
      const requestedDays = this.timeframeToDays(timeframe);
      const minDaysForCalculations = Math.max(requestedDays, 250); // Always fetch at least 250 days for proper MA/RSI
      
      const historicalData = await rateLimitedApi.coinGeckoRequest(async () => {
        const response = await this.coinGeckoClient.get('/coins/bitcoin/market_chart', {
          params: {
            vs_currency: 'usd',
            days: minDaysForCalculations,
            interval: minDaysForCalculations <= 1 ? 'hourly' : 'daily'
          }
        });
        return response.data;
      });

      const data = {
        current: {
          price: currentData.bitcoin.usd,
          change24h: currentData.bitcoin.usd_24h_change,
          volume24h: currentData.bitcoin.usd_24h_vol,
          marketCap: currentData.bitcoin.usd_market_cap
        },
        historical: historicalData.prices.map(([timestamp, price]) => ({
          timestamp: new Date(timestamp).toISOString(),
          price
        }))
      };

      // Use tiered caching based on timeframe
      if (timeframe === '1D') {
        await cacheService.setFrequent(cacheKey, data); // 30 min for intraday
      } else if (timeframe === '7D') {
        await cacheService.setStable(cacheKey, data); // 4 hours for weekly
      } else {
        await cacheService.setHistorical(cacheKey, data); // 24 hours for longer timeframes
      }
      console.log(`✅ [CoinGecko] Successfully fetched BTC data for ${timeframe} (${data.historical.length} points)`);
      return data;

    } catch (error) {
      console.error('❌ [CoinGecko] Error fetching BTC data, trying Binance fallback:', error.message);
      
      // Try Binance as fallback for historical data
      try {
        const binanceData = await this.getBTCDataFromBinance(timeframe);
        await cacheService.setFrequent(cacheKey, binanceData);
        console.log(`✅ [Binance] Serving BTC data for ${timeframe} (${binanceData.historical.length} points)`);
        return binanceData;
      } catch (binanceError) {
        console.error('❌ [Binance] Fallback also failed, using mock data:', binanceError.message);
        
        // Final fallback to mock data
        const mockData = this.generateMockBTCData(timeframe);
        await cacheService.set(cacheKey, mockData, 60); // 1 minute cache for mock data
        console.log(`🎭 [Mock] Serving mock BTC data for ${timeframe} (${mockData.historical.length} points)`);
        return mockData;
      }
    }
  }

  async getBTCDataFromBinance(timeframe) {
    // Get current price first
    const currentPriceResponse = await websocketService.getRealtimePrice('btc') || 
      await this.binanceClient.get('/v3/ticker/price', {
        params: { symbol: 'BTCUSDT' }
      }).then(res => ({ price: parseFloat(res.data.price) }));

    // Get historical klines from Binance
    const requestedDays = this.timeframeToDays(timeframe);
    const daysToFetch = Math.max(requestedDays, 250); // Always get at least 250 days
    
    const interval = daysToFetch <= 1 ? '1h' : '1d';
    const limit = daysToFetch <= 1 ? 24 : Math.min(daysToFetch, 1000); // Binance max is 1000

    const response = await this.binanceClient.get('/v3/klines', {
      params: {
        symbol: 'BTCUSDT',
        interval: interval,
        limit: limit
      }
    });

    const historical = response.data.map(kline => ({
      timestamp: new Date(kline[0]).toISOString(),
      price: parseFloat(kline[4]) // Close price
    }));

    return {
      current: {
        price: currentPriceResponse.price,
        change24h: 0, // Will be calculated if needed
        volume24h: 0, // Can be added from 24hr ticker if needed
        marketCap: currentPriceResponse.price * 19700000
      },
      historical
    };
  }

  timeframeToDays(timeframe) {
    const mapping = {
      '1D': 1,
      '7D': 7,
      '30D': 30,
      '90D': 90,
      '1Y': 365
    };
    return mapping[timeframe] || 1;
  }

  // Generic cryptocurrency data method
  async getCryptoData(symbol, timeframe = '1D') {
    const symbolMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'BITCOIN': 'bitcoin',
      'ETHEREUM': 'ethereum',
      'SOLANA': 'solana'
    };
    
    const coinId = symbolMap[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unsupported cryptocurrency: ${symbol}`);
    }

    const cacheKey = `crypto_data_${symbol}_${timeframe}`;
    
    // Try cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      // Get current price data with rate limiting
      const currentData = await rateLimitedApi.coinGeckoRequest(async () => {
        const response = await this.coinGeckoClient.get('/simple/price', {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true
          }
        });
        return response.data;
      });

      // Get historical data with rate limiting - ensure we have enough for RSI/MA calculations
      const requestedDays = this.timeframeToDays(timeframe);
      const minDaysForCalculations = Math.max(requestedDays, 250); // Always fetch at least 250 days
      
      const historicalData = await rateLimitedApi.coinGeckoRequest(async () => {
        const response = await this.coinGeckoClient.get(`/coins/${coinId}/market_chart`, {
          params: {
            vs_currency: 'usd',
            days: minDaysForCalculations,
            interval: minDaysForCalculations <= 1 ? 'hourly' : 'daily'
          }
        });
        return response.data;
      });

      const data = {
        current: {
          price: currentData[coinId].usd,
          change24h: currentData[coinId].usd_24h_change,
          volume24h: currentData[coinId].usd_24h_vol,
          marketCap: currentData[coinId].usd_market_cap
        },
        historical: historicalData.prices.map(([timestamp, price]) => ({
          timestamp: new Date(timestamp).toISOString(),
          price
        }))
      };

      // Cache successful results for 5 minutes
      await cacheService.set(cacheKey, data, 300);
      console.log(`✅ [CoinGecko] Successfully fetched ${symbol} data for ${timeframe} (${data.historical.length} points)`);
      return data;

    } catch (error) {
      console.error(`❌ [CoinGecko] Error fetching ${symbol} data, using fallback:`, error.message);
      
      // Generate mock data based on symbol
      const mockData = this.generateMockCryptoData(symbol, timeframe);
      await cacheService.set(cacheKey, mockData, 60); // 1 minute cache for mock data
      console.log(`🎭 [Mock] Serving mock ${symbol} data for ${timeframe} (${mockData.historical.length} points)`);
      return mockData;
    }
  }

  generateMockCryptoData(symbol, timeframe) {
    const priceMap = {
      'BTC': 116000,
      'ETH': 3500,
      'SOL': 240,
      'BITCOIN': 116000,
      'ETHEREUM': 3500,
      'SOLANA': 240
    };
    
    const basePrice = priceMap[symbol.toUpperCase()] || 1000;
    const requestedDays = this.timeframeToDays(timeframe);
    // Always generate at least 250 days of data for proper RSI/MA calculations
    const dataPoints = timeframe === '1D' ? 24 : Math.max(requestedDays, 250);
    
    const historical = [];
    const now = new Date();
    
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = new Date(now);
      if (timeframe === '1D') {
        timestamp.setHours(timestamp.getHours() - i);
      } else {
        timestamp.setDate(timestamp.getDate() - i);
      }
      
      // Generate realistic price movement
      const variation = (Math.random() - 0.5) * 0.03; // ±3% variation
      const price = basePrice * (1 + variation * (i / dataPoints));
      
      historical.push({
        timestamp: timestamp.toISOString(),
        price: Math.round(price * 100) / 100
      });
    }
    
    const currentPrice = historical[historical.length - 1].price;
    const marketCapMultiplier = symbol.toUpperCase() === 'BTC' ? 19700000 : 120000000; // Rough circulating supply
    
    return {
      current: {
        price: currentPrice,
        change24h: ((currentPrice - basePrice) / basePrice) * 100,
        volume24h: symbol.toUpperCase() === 'BTC' ? 45000000000 : 15000000000,
        marketCap: currentPrice * marketCapMultiplier
      },
      historical
    };
  }

  generateMockBTCData(timeframe) {
    const basePrice = 116000 + Math.random() * 2000; // BTC around $116k-$118k
    const requestedDays = this.timeframeToDays(timeframe);
    // Always generate at least 250 days of data for proper RSI/MA calculations
    const dataPoints = timeframe === '1D' ? 24 : Math.max(requestedDays, 250);
    
    const historical = [];
    const now = new Date();
    
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = new Date(now);
      if (timeframe === '1D') {
        timestamp.setHours(timestamp.getHours() - i);
      } else {
        timestamp.setDate(timestamp.getDate() - i);
      }
      
      // Generate realistic price movement
      const variation = (Math.random() - 0.5) * 0.03; // ±3% variation
      const price = basePrice * (1 + variation * (i / dataPoints));
      
      historical.push({
        timestamp: timestamp.toISOString(),
        price: Math.round(price * 100) / 100
      });
    }
    
    const currentPrice = historical[historical.length - 1].price;
    
    return {
      current: {
        price: currentPrice,
        change24h: ((currentPrice - basePrice) / basePrice) * 100,
        volume24h: 45000000000 + Math.random() * 10000000000,
        marketCap: currentPrice * 19700000 // ~19.7M BTC in circulation
      },
      historical
    };
  }

  async getFundingRates(exchange = 'binance') {
    const cacheKey = `funding_rates_${exchange}`;
    
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      let data = [];

      if (exchange === 'binance' || exchange === 'all') {
        // Get real funding rate from Binance Futures API
        try {
          const [priceResponse, fundingResponse] = await Promise.all([
            this.binanceClient.get('/v3/ticker/price', {
              params: { symbol: 'BTCUSDT' }
            }),
            this.binanceFuturesClient.get('/v1/fundingRate', {
              params: { 
                symbol: 'BTCUSDT',
                limit: 1
              }
            })
          ]);

          const fundingRateData = fundingResponse.data[0];
          const binanceRates = [{
            symbol: priceResponse.data.symbol,
            fundingRate: parseFloat(fundingRateData.fundingRate),
            nextFundingTime: new Date(fundingRateData.fundingTime + 8 * 60 * 60 * 1000).toISOString(),
            exchange: 'Binance',
            price: parseFloat(priceResponse.data.price)
          }];
          
          data = [...data, ...binanceRates];
          console.log('✅ [Binance] Real funding rate fetched:', fundingRateData.fundingRate);
          
        } catch (binanceError) {
          console.warn('⚠️ [Binance] Funding rate API failed, using fallback:', binanceError.message);
          
          // Fallback to price + mock funding rate
          const priceResponse = await this.binanceClient.get('/v3/ticker/price', {
            params: { symbol: 'BTCUSDT' }
          });
          
          const binanceRates = [{
            symbol: priceResponse.data.symbol,
            fundingRate: (Math.random() - 0.5) * 0.002, // Random funding rate between -0.1% to +0.1%
            nextFundingTime: new Date(Date.now() + (8 - new Date().getHours() % 8) * 60 * 60 * 1000).toISOString(),
            exchange: 'Binance',
            price: parseFloat(priceResponse.data.price)
          }];
          
          data = [...data, ...binanceRates];
          console.log('🎭 [Binance] Using mock funding rate with real price');
        }
      }

      // Add other exchanges here...

      await cacheService.setFrequent(cacheKey, data); // 30 minutes cache
      return data;

    } catch (error) {
      console.error('❌ Error fetching funding rates:', error.message);
      
      // Complete fallback with mock data
      const mockData = [{
        symbol: 'BTCUSDT',
        fundingRate: (Math.random() - 0.5) * 0.002,
        nextFundingTime: new Date(Date.now() + (8 - new Date().getHours() % 8) * 60 * 60 * 1000).toISOString(),
        exchange: 'Binance',
        price: 116000 + Math.random() * 2000
      }];
      
      await cacheService.setRealtime(cacheKey, mockData); // 1 minute cache for mock
      console.log('🎭 [Mock] Using complete mock funding rates');
      return mockData;
    }
  }

  /* 
   * RETAIL DAO Token Support (Commented for future implementation)
   * 
   * To re-enable RETAIL DAO support, add back to symbolMap:
   * 'RETAIL': 'retail-dao',
   * 'RETAIL-DAO': 'retail-dao'
   */
}

module.exports = { CryptoDataService };