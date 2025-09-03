// Enhanced Persistent Mock Data Service
// Generates realistic mock data based on cached real data patterns
// Falls back gracefully when real data is unavailable

import mockDataService from './mockDataService.js';

class PersistentMockDataService {
  constructor() {
    this.lastRealData = null;
    this.lastUpdateTime = null;
    this.mockDataCache = null;
    
    // Storage keys for persistence
    this.STORAGE_KEYS = {
      LAST_REAL_DATA: 'retaildao_last_real_data',
      LAST_UPDATE: 'retaildao_last_update',
      MOCK_CACHE: 'retaildao_mock_cache'
    };
    
    // Initialize from localStorage if available
    this.loadFromStorage();
  }

  // Load previously cached real data from localStorage
  loadFromStorage() {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEYS.LAST_REAL_DATA);
      const storedUpdate = localStorage.getItem(this.STORAGE_KEYS.LAST_UPDATE);
      const storedMock = localStorage.getItem(this.STORAGE_KEYS.MOCK_CACHE);

      if (storedData) {
        this.lastRealData = JSON.parse(storedData);
        console.log('📦 Loaded cached real data patterns from storage');
      }

      if (storedUpdate) {
        this.lastUpdateTime = new Date(storedUpdate);
        console.log('📦 Last real data update:', this.lastUpdateTime.toLocaleString());
      }

      if (storedMock) {
        this.mockDataCache = JSON.parse(storedMock);
        console.log('📦 Loaded mock data cache from storage');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached data from storage:', error.message);
      this.lastRealData = null;
      this.lastUpdateTime = null;
      this.mockDataCache = null;
    }
  }

  // Save real data patterns to localStorage for future mock generation
  saveToStorage() {
    try {
      if (this.lastRealData) {
        localStorage.setItem(this.STORAGE_KEYS.LAST_REAL_DATA, JSON.stringify(this.lastRealData));
      }
      if (this.lastUpdateTime) {
        localStorage.setItem(this.STORAGE_KEYS.LAST_UPDATE, this.lastUpdateTime.toISOString());
      }
      if (this.mockDataCache) {
        localStorage.setItem(this.STORAGE_KEYS.MOCK_CACHE, JSON.stringify(this.mockDataCache));
      }
      console.log('💾 Saved real data patterns to storage');
    } catch (error) {
      console.warn('⚠️ Failed to save data patterns to storage:', error.message);
    }
  }

  // Update with fresh real data when available
  updateWithRealData(realData) {
    try {
      // Extract key patterns from real data for future mock generation
      const patterns = {
        timestamp: new Date().toISOString(),
        prices: {},
        volatility: {},
        trends: {},
        ranges: {}
      };

      // Extract BTC patterns
      if (realData.btc?.historical || realData.bitcoin?.prices) {
        const btcPrices = realData.btc?.historical || realData.bitcoin?.prices || [];
        if (btcPrices.length > 0) {
          patterns.prices.bitcoin = {
            current: realData.btc?.current?.price || realData.bitcoin?.currentPrice || btcPrices[btcPrices.length - 1]?.price,
            recent: btcPrices.slice(-30).map(p => p.price || p.value).filter(p => typeof p === 'number'),
            change24h: realData.btc?.current?.change24h || realData.bitcoin?.priceChangePercent24h || 0
          };
          
          patterns.volatility.bitcoin = this.calculateVolatility(patterns.prices.bitcoin.recent);
          patterns.trends.bitcoin = this.calculateTrend(patterns.prices.bitcoin.recent);
          patterns.ranges.bitcoin = this.calculateRange(patterns.prices.bitcoin.recent);
        }
      }

      // Extract ETH patterns
      if (realData.eth?.historical || realData.ethereum?.prices) {
        const ethPrices = realData.eth?.historical || realData.ethereum?.prices || [];
        if (ethPrices.length > 0) {
          patterns.prices.ethereum = {
            current: realData.eth?.current?.price || realData.ethereum?.currentPrice || ethPrices[ethPrices.length - 1]?.price,
            recent: ethPrices.slice(-30).map(p => p.price || p.value).filter(p => typeof p === 'number'),
            change24h: realData.eth?.current?.change24h || realData.ethereum?.priceChangePercent24h || 0
          };
          
          patterns.volatility.ethereum = this.calculateVolatility(patterns.prices.ethereum.recent);
          patterns.trends.ethereum = this.calculateTrend(patterns.prices.ethereum.recent);
          patterns.ranges.ethereum = this.calculateRange(patterns.prices.ethereum.recent);
        }
      }

      // Extract DXY patterns
      if (realData.dxy?.historical || realData.dxyData?.prices) {
        const dxyPrices = realData.dxy?.historical || realData.dxyData?.prices || [];
        if (dxyPrices.length > 0) {
          patterns.prices.dxy = {
            current: realData.dxy?.currentPrice || dxyPrices[dxyPrices.length - 1]?.price || dxyPrices[dxyPrices.length - 1]?.value,
            recent: dxyPrices.slice(-30).map(p => p.price || p.value).filter(p => typeof p === 'number')
          };
        }
      }

      this.lastRealData = patterns;
      this.lastUpdateTime = new Date();
      this.saveToStorage();

      console.log('✅ Updated persistent mock service with real data patterns');
      console.log('📊 Patterns extracted:', {
        cryptos: Object.keys(patterns.prices),
        timestamp: patterns.timestamp
      });

      // Generate fresh mock data based on these patterns
      this.generateMockFromPatterns();

    } catch (error) {
      console.error('❌ Failed to update with real data:', error.message);
    }
  }

  // Calculate volatility (standard deviation of returns)
  calculateVolatility(prices) {
    if (!prices || prices.length < 2) return 0.02; // Default 2% volatility

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  // Calculate trend direction (-1 bearish, 0 sideways, 1 bullish)
  calculateTrend(prices) {
    if (!prices || prices.length < 10) return 0;

    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.05) return 1;      // Strong bullish
    if (change < -0.05) return -1;    // Strong bearish
    return 0;                         // Sideways
  }

  // Calculate price range (min/max from recent data)
  calculateRange(prices) {
    if (!prices || prices.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }

  // Generate realistic mock data based on stored real data patterns
  generateMockFromPatterns() {
    try {
      if (!this.lastRealData) {
        console.log('🎭 No real data patterns available, using default mock data');
        this.mockDataCache = this.generateDefaultMockData();
        return;
      }

      console.log('🧪 Generating realistic mock data from real data patterns...');

      const patterns = this.lastRealData;
      const now = new Date();
      
      // Generate mock data with realistic patterns
      const mockData = {
        bitcoin: this.generateCryptoMockData('bitcoin', patterns, now),
        ethereum: this.generateCryptoMockData('ethereum', patterns, now),
        solana: this.generateSolanaMockData(patterns, now),
        cryptoPrices: {},
        dxy: this.generateDXYMockData(patterns, now),
        dxyData: this.generateDXYMockData(patterns, now),
        fundingRates: this.generateFundingRatesMockData(patterns, now),
        etfFlows: this.generateETFFlowsMockData(patterns, now)
      };

      // Fill cryptoPrices structure for price cards
      mockData.cryptoPrices = {
        bitcoin: {
          price: mockData.bitcoin.currentPrice,
          change: mockData.bitcoin.priceChangePercent24h,
          historical: mockData.bitcoin.prices
        },
        ethereum: {
          price: mockData.ethereum.currentPrice,
          change: mockData.ethereum.priceChangePercent24h,
          historical: mockData.ethereum.prices
        },
        solana: {
          price: mockData.solana.currentPrice,
          change: mockData.solana.priceChangePercent24h,
          historical: mockData.solana.prices
        }
      };

      this.mockDataCache = mockData;
      this.saveToStorage();

      console.log('✅ Generated realistic mock data based on real patterns');

    } catch (error) {
      console.error('❌ Failed to generate mock from patterns:', error.message);
      this.mockDataCache = this.generateDefaultMockData();
    }
  }

  // Generate crypto-specific mock data based on real patterns
  generateCryptoMockData(cryptoKey, patterns, now) {
    const pattern = patterns.prices[cryptoKey];
    if (!pattern) {
      return this.generateDefaultCryptoData(cryptoKey);
    }

    const basePrice = pattern.current;
    const volatility = patterns.volatility[cryptoKey] || 0.02;
    const trend = patterns.trends[cryptoKey] || 0;

    // Generate price history with realistic movement
    const prices = [];
    const days = 220;
    let currentPrice = basePrice;

    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // Add trend and volatility
      const trendFactor = trend * 0.001 * (days - i); // Gradual trend over time
      const volatilityFactor = (Math.random() - 0.5) * volatility * 2;
      
      currentPrice = currentPrice * (1 + trendFactor + volatilityFactor);
      
      prices.push({
        timestamp: date,
        price: currentPrice
      });
    }

    // Calculate 24h change
    const price24hAgo = prices[prices.length - 2]?.price || currentPrice;
    const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

    return {
      currentPrice: currentPrice,
      priceChangePercent24h: change24h,
      priceChange24h: change24h,
      marketCap: this.estimateMarketCap(cryptoKey, currentPrice),
      volume24h: this.estimateVolume(cryptoKey, currentPrice, volatility),
      prices: prices,
      source: 'Pattern-Based Mock',
      lastPatternUpdate: patterns.timestamp
    };
  }

  // Generate DXY mock data
  generateDXYMockData(patterns, now) {
    const dxyPattern = patterns.prices.dxy;
    const basePrice = dxyPattern ? dxyPattern.current : 102.5;
    
    const prices = [];
    let currentPrice = basePrice;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // DXY typically has lower volatility
      const volatilityFactor = (Math.random() - 0.5) * 0.005;
      currentPrice = currentPrice * (1 + volatilityFactor);
      
      prices.push({
        timestamp: date,
        price: currentPrice,
        value: currentPrice
      });
    }

    return {
      currentPrice: currentPrice,
      prices: prices,
      historical: prices,
      source: 'Pattern-Based Mock'
    };
  }

  // Generate Solana mock data (using ETH patterns as basis)
  generateSolanaMockData(patterns, now) {
    // Use ETH patterns as a basis for SOL, but with higher volatility
    const ethPattern = patterns.prices.ethereum;
    const basePrice = ethPattern ? ethPattern.current * 0.05 : 180; // Rough SOL/ETH ratio
    const volatility = patterns.volatility.ethereum ? patterns.volatility.ethereum * 1.5 : 0.04;

    const prices = [];
    let currentPrice = basePrice;

    for (let i = 220; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const volatilityFactor = (Math.random() - 0.5) * volatility * 2;
      currentPrice = currentPrice * (1 + volatilityFactor);
      
      prices.push({
        timestamp: date,
        price: currentPrice
      });
    }

    const price24hAgo = prices[prices.length - 2]?.price || currentPrice;
    const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

    return {
      currentPrice: currentPrice,
      priceChangePercent24h: change24h,
      priceChange24h: change24h,
      marketCap: currentPrice * 467000000, // Rough SOL supply
      volume24h: currentPrice * Math.random() * 50000000,
      prices: prices,
      source: 'Pattern-Based Mock'
    };
  }

  // Generate funding rates mock data
  generateFundingRatesMockData(patterns, now) {
    // Base funding rates on market volatility patterns
    const btcVolatility = patterns.volatility?.bitcoin || 0.02;
    const ethVolatility = patterns.volatility?.ethereum || 0.02;

    return {
      btc: {
        rate: (btcVolatility - 0.02) * 2 + (Math.random() - 0.5) * 0.001,
        trend: btcVolatility > 0.03 ? 'bearish' : 'bullish'
      },
      eth: {
        rate: (ethVolatility - 0.02) * 2 + (Math.random() - 0.5) * 0.001,
        trend: ethVolatility > 0.03 ? 'bearish' : 'bullish'
      }
    };
  }

  // Generate ETF flows mock data
  generateETFFlowsMockData(patterns, now) {
    const flows = [];
    const trend = patterns.trends?.bitcoin || 0;

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // Base flows on trend: positive trend = inflows, negative = outflows
      const baseFlow = trend * 500; // Million USD
      const randomFactor = (Math.random() - 0.5) * 1000;
      const flow = baseFlow + randomFactor;

      flows.push({
        date: date.toISOString().split('T')[0],
        timestamp: date,
        value: Math.round(flow),
        amount: Math.round(flow),
        flow: Math.round(flow)
      });
    }

    return {
      btcFlows: flows
    };
  }

  // Estimate market cap based on crypto type and price
  estimateMarketCap(cryptoKey, price) {
    const supplies = {
      bitcoin: 19700000,
      ethereum: 120000000,
      solana: 467000000
    };
    
    return price * (supplies[cryptoKey] || 1000000);
  }

  // Estimate volume based on price and volatility
  estimateVolume(cryptoKey, price, volatility) {
    const baseVolumes = {
      bitcoin: 30000000000,
      ethereum: 15000000000,
      solana: 2000000000
    };
    
    const base = baseVolumes[cryptoKey] || 1000000000;
    return base * (1 + volatility * 10); // Higher volatility = higher volume
  }

  // Fallback default mock data when no patterns available
  generateDefaultMockData() {
    console.log('🎭 Generating default mock data');
    
    // Use original mock service for fallback
    return mockDataService.generateMockData();
  }

  generateDefaultCryptoData(cryptoKey) {
    const defaults = {
      bitcoin: { price: 110000, change: 2.5 },
      ethereum: { price: 4200, change: 1.8 },
      solana: { price: 185, change: 3.2 }
    };

    const def = defaults[cryptoKey] || { price: 1, change: 0 };
    
    return {
      currentPrice: def.price,
      priceChangePercent24h: def.change,
      priceChange24h: def.change,
      marketCap: this.estimateMarketCap(cryptoKey, def.price),
      volume24h: this.estimateVolume(cryptoKey, def.price, 0.02),
      prices: [],
      source: 'Default Mock'
    };
  }

  // Main method to get mock data
  async getAllMarketData() {
    // Check if we need to regenerate mock data
    const now = new Date();
    const cacheAge = this.lastUpdateTime ? now - this.lastUpdateTime : Infinity;
    
    // Regenerate if cache is older than 1 hour or doesn't exist
    if (!this.mockDataCache || cacheAge > 60 * 60 * 1000) {
      console.log('🔄 Mock data cache expired or missing, regenerating...');
      this.generateMockFromPatterns();
    }

    // Add minimal realistic delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Add small real-time variations to prices
    if (this.mockDataCache) {
      const variation = (Math.random() - 0.5) * 0.001; // 0.1% max variation
      
      ['bitcoin', 'ethereum', 'solana'].forEach(crypto => {
        if (this.mockDataCache[crypto]) {
          this.mockDataCache[crypto].currentPrice *= (1 + variation);
          
          // Update crypto prices structure too
          if (this.mockDataCache.cryptoPrices && this.mockDataCache.cryptoPrices[crypto]) {
            this.mockDataCache.cryptoPrices[crypto].price = this.mockDataCache[crypto].currentPrice;
          }
        }
      });
    }

    return this.mockDataCache || this.generateDefaultMockData();
  }

  // Method to check if we have fresh real data patterns
  hasRecentPatterns(maxAgeMinutes = 60) {
    if (!this.lastUpdateTime) return false;
    
    const now = new Date();
    const ageMinutes = (now - this.lastUpdateTime) / (1000 * 60);
    
    return ageMinutes <= maxAgeMinutes;
  }

  // Get info about current mock data state
  getDataInfo() {
    return {
      hasPatterns: !!this.lastRealData,
      lastPatternUpdate: this.lastUpdateTime,
      cacheExists: !!this.mockDataCache,
      patternsAge: this.lastUpdateTime ? new Date() - this.lastUpdateTime : null
    };
  }
}

// Export singleton instance
export default new PersistentMockDataService();