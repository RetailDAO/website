const axios = require('axios');
const config = require('../../config/environment');
const cacheService = require('../cache/cacheService');
const rateLimitedApi = require('../rateLimitedApi');
const websocketService = require('../websocket/websocketService');
const intelligentMockService = require('../cache/intelligentMockService');
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
    const dataType = `btc_${timeframe}`;
    
    // Use enhanced cache with golden dataset integration
    const result = await cacheService.getOrFetchWithGolden(
      cacheKey,
      () => this.fetchBTCDataFromAPI(timeframe),
      {
        dataType: dataType,
        tier: 'tier2_frequent'
      }
    );

    if (result.data) {
      // Add metadata about data source for transparency
      result.data.dataSource = result.source;
      result.data.fresh = result.fresh;
      if (result.metadata) {
        result.data.cacheMetadata = result.metadata;
      }
    }

    return result.data;
  }

  // Separated API fetching logic for cleaner code
  async fetchBTCDataFromAPI(timeframe = '1D') {

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

      // Optimized data fetching for specific needs:
      // RSI: needs max 30 days, MA: needs max 100 days for BTC terminal
      const requestedDays = this.timeframeToDays(timeframe);
      const optimizedDays = Math.min(requestedDays, 90); // Respect CoinGecko free tier limit
      console.log(`📊 Optimized API call: requesting ${optimizedDays} days (vs ${requestedDays} original)`);
      
      const historicalData = await rateLimitedApi.coinGeckoRequest(async () => {
        const response = await this.coinGeckoClient.get('/coins/bitcoin/market_chart', {
          params: {
            vs_currency: 'usd',
            days: optimizedDays,
            interval: optimizedDays <= 1 ? 'hourly' : 'daily'
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

      console.log(`✅ [CoinGecko] Successfully fetched BTC data for ${timeframe} (${data.historical.length} points)`);
      return data;

    } catch (error) {
      console.error('❌ [CoinGecko] Error fetching BTC data, trying Binance fallback:', error.message);
      
      // Try Binance as fallback for historical data
      try {
        const binanceData = await this.getBTCDataFromBinance(timeframe);
        console.log(`✅ [Binance] Serving BTC data for ${timeframe} (${binanceData.historical.length} points)`);
        return binanceData;
      } catch (binanceError) {
        console.error('❌ [Binance] Fallback also failed, using mock data:', binanceError.message);
        
        // Final fallback to intelligent mock data based on golden dataset
        const mockData = await intelligentMockService.generateIntelligentMockData('BTC', timeframe, {
          includeRSI: true,
          includeMA: true,
          includeVolume: true
        });
        console.log(`🧠 [IntelligentMock] Serving realistic mock BTC data for ${timeframe} (${mockData.historical.length} points, confidence: ${mockData.confidence}%)`);
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
    const daysToFetch = Math.max(requestedDays, 220); // Need 220+ days for 200-day MA // Always get at least 250 days
    
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
      '30D': 30,    // Perfect for RSI calculations (max 30 days)
      '90D': 90,    // Good for MAs up to 90-day
      '100D': 90,   // Optimized: cap at 90 days (CoinGecko free limit) for 100-day MAs  
      '1Y': 90      // Optimized: reduce from 365 to 90 days to stay within limits
    };
    return mapping[timeframe] || 1;
  }

  // Optimized batch method - BTC (100D for MAs) and ETH (30D for RSI) only
  async getBatchCryptoData(symbols, timeframe = '1D') {
    const symbolMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BITCOIN': 'bitcoin',
      'ETHEREUM': 'ethereum'
      // Removed SOL to reduce API calls
    };
    
    const validSymbols = symbols.filter(symbol => symbolMap[symbol.toUpperCase()]);
    if (validSymbols.length === 0) {
      throw new Error(`No supported cryptocurrencies in: ${symbols.join(', ')}`);
    }

    const cacheKey = `batch_crypto_data_${validSymbols.join('_')}_${timeframe}`;
    
    // Try cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`📊 Using cached batch data for ${validSymbols.join(', ')}`);
      return cachedData;
    }

    // Check individual caches and determine what needs to be fetched
    const results = {};
    const symbolsToFetch = [];
    const symbolsWithCache = [];
    
    for (const symbol of validSymbols) {
      const individualCacheKey = `crypto_data_${symbol}_${timeframe}`;
      const individualCache = await cacheService.get(individualCacheKey);
      
      if (individualCache) {
        results[symbol] = individualCache;
        symbolsWithCache.push(symbol);
      } else {
        symbolsToFetch.push(symbol);
      }
    }
    
    if (symbolsWithCache.length > 0) {
      console.log(`📊 Found cached data for: ${symbolsWithCache.join(', ')}`);
    }
    
    if (symbolsToFetch.length === 0) {
      console.log(`✅ All batch data served from individual caches`);
      await cacheService.set(cacheKey, results, 300);
      return results;
    }

    console.log(`🔄 Need to fetch data for: ${symbolsToFetch.join(', ')}`);

    try {
      // Single batch request for all current prices of symbols that need fetching
      const fetchCoinIds = symbolsToFetch.map(symbol => symbolMap[symbol.toUpperCase()]);
      const fetchCoinIdsString = fetchCoinIds.join(',');
      
      const currentData = await rateLimitedApi.coinGeckoRequest(async () => {
        const response = await this.coinGeckoClient.get('/simple/price', {
          params: {
            ids: fetchCoinIdsString,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true
          }
        });
        return response.data;
      }, `batch_prices_${fetchCoinIdsString}_${timeframe}`);

      // Optimized: Use specific timeframes per asset (BTC: 90d, ETH: 30d)
      
      const historicalRequests = symbolsToFetch.map(symbol => {
        const coinId = symbolMap[symbol.toUpperCase()];
        
        // Conservative timeframes to avoid CoinGecko 400 errors: BTC 30 days, ETH 30 days
        const optimizedDays = 30; // Reduced from 90 to 30 for BTC to avoid API errors
        console.log(`📊 Optimized request: ${symbol} using ${optimizedDays} days (reduced for API compatibility)`);
        
        return {
          key: `historical_${coinId}_${optimizedDays}d`,
          symbol: symbol,
          coinId: coinId,
          fn: async () => {
            console.log(`🔍 CoinGecko API call: /coins/${coinId}/market_chart?vs_currency=usd&days=${optimizedDays}&interval=daily`);
            const response = await this.coinGeckoClient.get(`/coins/${coinId}/market_chart`, {
              params: {
                vs_currency: 'usd',
                days: optimizedDays
                // Removed interval parameter - let CoinGecko decide automatically
              }
            });
            return response.data;
          }
        };
      });
      
      // Use batch request system to handle historical data efficiently
      const historicalResults = await rateLimitedApi.coinGeckoBatchRequest(historicalRequests);
      
      // Process results and handle any failures
      for (const result of historicalResults) {
        const request = historicalRequests.find(req => req.key === result.key);
        if (!request) continue;
        
        const symbol = request.symbol;
        const coinId = request.coinId;
        
        if (result.success && currentData[coinId]) {
          const symbolData = {
            current: {
              price: currentData[coinId].usd,
              change24h: currentData[coinId].usd_24h_change,
              volume24h: currentData[coinId].usd_24h_vol,
              marketCap: currentData[coinId].usd_market_cap
            },
            historical: result.data.prices.map(([timestamp, price]) => ({
              timestamp: new Date(timestamp).toISOString(),
              price
            }))
          };
          
          results[symbol] = symbolData;
          
          // Cache individual symbol data for future requests
          const individualCacheKey = `crypto_data_${symbol}_${timeframe}`;
          await cacheService.set(individualCacheKey, symbolData, 300);
          
          console.log(`✅ [CoinGecko] Successfully fetched ${symbol} data for ${timeframe} (${symbolData.historical.length} points)`);
          
        } else {
          console.error(`❌ [CoinGecko] Error fetching ${symbol} data, using fallback:`, result.error?.message || 'Unknown error');
          
          // Check if we have recent cached data we can use
          const recentCacheKey = `crypto_data_${symbol}_${timeframe}`;
          const recentCache = await cacheService.get(recentCacheKey);
          
          if (recentCache) {
            console.log(`📊 Using recent cached data for ${symbol}`);
            results[symbol] = recentCache;
          } else {
            // Generate intelligent mock data based on golden dataset
            const mockData = await intelligentMockService.generateIntelligentMockData(symbol, timeframe, {
              includeRSI: true,
              includeMA: true,
              includeVolume: true
            });
            results[symbol] = mockData;
            console.log(`🧠 [IntelligentMock] Generated realistic mock data for ${symbol} (confidence: ${mockData.confidence}%)`);
          }
        }
      }

      // Cache the complete batch results
      await cacheService.set(cacheKey, results, 300);
      console.log(`✅ [CoinGecko] Completed batch request for ${validSymbols.join(', ')} (${timeframe})`);
      return results;

    } catch (error) {
      console.error(`❌ [CoinGecko] Critical error in batch request, using comprehensive fallback:`, error.message);
      
      // Generate mock data for any symbols we don't have
      for (const symbol of symbolsToFetch) {
        if (!results[symbol]) {
          results[symbol] = await intelligentMockService.generateIntelligentMockData(symbol, timeframe, {
            includeRSI: true,
            includeMA: true,
            includeVolume: true
          });
        }
      }
      
      await cacheService.set(cacheKey, results, 60); // Shorter cache for fallback data
      console.log(`🎭 [Mock] Serving comprehensive fallback data for ${validSymbols.join(', ')} (${timeframe})`);
      return results;
    }
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
      // Smart hybrid approach: get 90 days from API, extend with mock data for MAs
const minDaysForCalculations = Math.max(requestedDays, 90); // CoinGecko free tier limit
// Removed: requiredDaysForMAs - now using optimized 90-day limit
      // Limit days to avoid CoinGecko API errors (max 365 days for free tier)
      const safeDaysLimit = Math.min(minDaysForCalculations, 90); // CoinGecko free tier max
      
      const historicalData = await rateLimitedApi.coinGeckoRequest(async () => {
        const response = await this.coinGeckoClient.get(`/coins/${coinId}/market_chart`, {
          params: {
            vs_currency: 'usd',
            days: safeDaysLimit,
            interval: safeDaysLimit <= 1 ? 'hourly' : 'daily'
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
      
      // Generate intelligent mock data based on golden dataset
      const mockData = await intelligentMockService.generateIntelligentMockData(symbol, timeframe, {
        includeRSI: true,
        includeMA: true,
        includeVolume: true
      });
      await cacheService.set(cacheKey, mockData, 60); // 1 minute cache for mock data
      console.log(`🧠 [IntelligentMock] Serving realistic mock ${symbol} data for ${timeframe} (${mockData.historical.length} points, confidence: ${mockData.confidence}%)`);
      return mockData;
    }
  }

  // Enhanced mock data generation that uses recent cached data as a baseline
  async generateEnhancedMockData(symbol, timeframe) {
    const priceMap = {
      'BTC': 116000,
      'ETH': 3500,
      'SOL': 240,
      'BITCOIN': 116000,
      'ETHEREUM': 3500,
      'SOLANA': 240
    };
    
    // Try to find the most recent cached data for this symbol to use as baseline
    let baselineData = null;
    let baselinePrice = priceMap[symbol.toUpperCase()] || 1000;
    
    // Check various timeframes for recent data
    const timeframesToCheck = ['1D', '7D', '30D', '90D', '1Y'];
    for (const tf of timeframesToCheck) {
      const cacheKey = `crypto_data_${symbol}_${tf}`;
      const cached = await cacheService.get(cacheKey);
      if (cached && cached.current && cached.current.price) {
        baselineData = cached;
        baselinePrice = cached.current.price;
        console.log(`📊 Using cached ${symbol} data from ${tf} as baseline for mock generation`);
        break;
      }
    }
    
    const requestedDays = this.timeframeToDays(timeframe);
    const dataPoints = timeframe === '1D' ? 24 : Math.max(requestedDays, 220); // Need 220+ days for 200-day MA
    
    const historical = [];
    const now = new Date();
    
    // If we have baseline data, use its recent trend
    let trendFactor = 0;
    if (baselineData && baselineData.historical && baselineData.historical.length > 10) {
      const recentPrices = baselineData.historical.slice(-10);
      const oldPrice = recentPrices[0].price;
      const newPrice = recentPrices[recentPrices.length - 1].price;
      trendFactor = (newPrice - oldPrice) / oldPrice;
    }
    
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = new Date(now);
      if (timeframe === '1D') {
        timestamp.setHours(timestamp.getHours() - i);
      } else {
        timestamp.setDate(timestamp.getDate() - i);
      }
      
      // Generate more realistic price movement based on baseline data
      const randomVariation = (Math.random() - 0.5) * 0.02; // ±2% random variation
      const timeDecay = Math.pow(0.999, i); // Slight decay over time
      const trendInfluence = trendFactor * (1 - i / dataPoints) * 0.5; // Apply trend influence
      
      const price = baselinePrice * (timeDecay + randomVariation + trendInfluence);
      
      historical.push({
        timestamp: timestamp.toISOString(),
        price: Math.round(price * 100) / 100
      });
    }
    
    const currentPrice = historical[historical.length - 1].price;
    const previousPrice = historical[Math.max(0, historical.length - 25)].price; // 24h ago equivalent
    const marketCapMultiplier = symbol.toUpperCase() === 'BTC' ? 19700000 : 120000000;
    
    return {
      current: {
        price: currentPrice,
        change24h: ((currentPrice - previousPrice) / previousPrice) * 100,
        volume24h: symbol.toUpperCase() === 'BTC' ? 45000000000 + Math.random() * 10000000000 : 15000000000 + Math.random() * 5000000000,
        marketCap: currentPrice * marketCapMultiplier
      },
      historical
    };
  }
  
  // Legacy method for backward compatibility
  async generateMockCryptoData(symbol, timeframe) {
    // Call intelligent mock service with proper async handling
    try {
      return await intelligentMockService.generateIntelligentMockData(symbol, timeframe, {
        includeRSI: true,
        includeMA: true,
        includeVolume: true
      });
    } catch (error) {
      console.error(`Error generating intelligent mock data for ${symbol}, falling back to simple mock:`, error.message);
      
      // Simple fallback mock generation
      const priceMap = {
        'BTC': 116000, 'ETH': 3500, 'SOL': 240,
        'BITCOIN': 116000, 'ETHEREUM': 3500, 'SOLANA': 240
      };
      
      const basePrice = priceMap[symbol.toUpperCase()] || 1000;
      const requestedDays = this.timeframeToDays(timeframe);
      const dataPoints = timeframe === '1D' ? 24 : Math.max(requestedDays, 220); // Need 220+ days for 200-day MA
      
      const historical = [];
      const now = new Date();
      
      for (let i = dataPoints; i >= 0; i--) {
        const timestamp = new Date(now);
        if (timeframe === '1D') {
          timestamp.setHours(timestamp.getHours() - i);
        } else {
          timestamp.setDate(timestamp.getDate() - i);
        }
        
        const variation = (Math.random() - 0.5) * 0.03;
        const price = basePrice * (1 + variation * (i / dataPoints));
        
        historical.push({
          timestamp: timestamp.toISOString(),
          price: Math.round(price * 100) / 100
        });
      }
      
      const currentPrice = historical[historical.length - 1].price;
      const marketCapMultiplier = symbol.toUpperCase() === 'BTC' ? 19700000 : 120000000;
      
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
  }

  // Legacy BTC mock data method - now uses enhanced system
  async generateMockBTCData(timeframe) {
    return await this.generateEnhancedMockData('BTC', timeframe);
  }

  // Proactive cache warming method to improve fallback data quality
  async warmCacheWithRecentData() {
    const symbols = ['BTC', 'ETH', 'SOL'];
    const timeframes = ['1D', '7D', '30D'];
    const warmingData = {};
    
    console.log('🔥 Starting proactive cache warming...');
    
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const cacheKey = `crypto_data_${symbol}_${timeframe}`;
        
        // Check if data is fresh (less than half of normal TTL)
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData) {
          // Data exists and is relatively fresh
          continue;
        }
        
        try {
          // Fetch fresh data with careful rate limiting
          const freshData = await this.getCryptoData(symbol, timeframe);
          if (freshData && freshData.current && freshData.historical) {
            warmingData[`${symbol}_${timeframe}`] = {
              data: freshData,
              tier: timeframe === '1D' ? 'tier2_frequent' : 'tier3_stable'
            };
            console.log(`✅ Warmed cache for ${symbol} ${timeframe}`);
          }
          
          // Be respectful with timing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.log(`⚠️ Could not warm ${symbol} ${timeframe}: ${error.message}`);
          // Continue with other symbols rather than failing completely
        }
      }
    }
    
    if (Object.keys(warmingData).length > 0) {
      await cacheService.warmCache(warmingData);
      console.log(`🔥 Cache warming completed for ${Object.keys(warmingData).length} items`);
    }
    
    return warmingData;
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
        // Get real funding rate from Binance Futures API for BTC and ETH
        try {
          const [btcPriceResponse, btcFundingResponse, ethPriceResponse, ethFundingResponse] = await Promise.all([
            this.binanceClient.get('/v3/ticker/price', {
              params: { symbol: 'BTCUSDT' }
            }),
            this.binanceFuturesClient.get('/fapi/v1/fundingRate', {
              params: { 
                symbol: 'BTCUSDT'
              }
            }),
            this.binanceClient.get('/v3/ticker/price', {
              params: { symbol: 'ETHUSDT' }
            }),
            this.binanceFuturesClient.get('/fapi/v1/fundingRate', {
              params: { 
                symbol: 'ETHUSDT'
              }
            })
          ]);

          const btcFundingRateData = btcFundingResponse.data[0];
          const ethFundingRateData = ethFundingResponse.data[0];
          
          const binanceRates = [
            {
              symbol: btcPriceResponse.data.symbol,
              fundingRate: parseFloat(btcFundingRateData.fundingRate),
              nextFundingTime: new Date(btcFundingRateData.fundingTime + 8 * 60 * 60 * 1000).toISOString(),
              exchange: 'Binance',
              price: parseFloat(btcPriceResponse.data.price)
            },
            {
              symbol: ethPriceResponse.data.symbol,
              fundingRate: parseFloat(ethFundingRateData.fundingRate),
              nextFundingTime: new Date(ethFundingRateData.fundingTime + 8 * 60 * 60 * 1000).toISOString(),
              exchange: 'Binance',
              price: parseFloat(ethPriceResponse.data.price)
            }
          ];
          
          data = [...data, ...binanceRates];
          console.log('✅ [Binance] Real funding rates fetched - BTC:', btcFundingRateData.fundingRate, 'ETH:', ethFundingRateData.fundingRate);
          
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

      // Transform array to expected frontend structure
      const transformedData = {
        btc: data.find(item => item.symbol === 'BTCUSDT') ? {
          rate: data.find(item => item.symbol === 'BTCUSDT').fundingRate,
          trend: data.find(item => item.symbol === 'BTCUSDT').fundingRate > 0 ? 'positive' : 'negative',
          nextFundingTime: data.find(item => item.symbol === 'BTCUSDT').nextFundingTime,
          exchange: 'Binance'
        } : null,
        eth: data.find(item => item.symbol === 'ETHUSDT') ? {
          rate: data.find(item => item.symbol === 'ETHUSDT').fundingRate,
          trend: data.find(item => item.symbol === 'ETHUSDT').fundingRate > 0 ? 'positive' : 'negative',
          nextFundingTime: data.find(item => item.symbol === 'ETHUSDT').nextFundingTime,
          exchange: 'Binance'
        } : null,
        raw: data // Keep raw data for debugging
      };

      await cacheService.setFrequent(cacheKey, transformedData); // 30 minutes cache
      return transformedData;

    } catch (error) {
      console.error('❌ Error fetching funding rates:', error.message);
      
      // Complete fallback with mock data in expected structure
      const btcRate = (Math.random() - 0.5) * 0.002;
      const ethRate = (Math.random() - 0.5) * 0.0015;
      
      const mockData = {
        btc: {
          rate: btcRate,
          trend: btcRate > 0 ? 'positive' : 'negative',
          nextFundingTime: new Date(Date.now() + (8 - new Date().getHours() % 8) * 60 * 60 * 1000).toISOString(),
          exchange: 'Mock'
        },
        eth: {
          rate: ethRate,
          trend: ethRate > 0 ? 'positive' : 'negative',
          nextFundingTime: new Date(Date.now() + (8 - new Date().getHours() % 8) * 60 * 60 * 1000).toISOString(),
          exchange: 'Mock'
        },
        raw: [{
          symbol: 'BTCUSDT',
          fundingRate: btcRate,
          nextFundingTime: new Date(Date.now() + (8 - new Date().getHours() % 8) * 60 * 60 * 1000).toISOString(),
          exchange: 'Mock',
          price: 116000 + Math.random() * 2000
        }]
      };
      
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