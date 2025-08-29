const cacheService = require('../cache/cacheService');

class MovingAverageService {
  constructor() {
    this.maPeriods = [20, 50, 100, 200];
  }

  // Calculate Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const slice = prices.slice(-period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  // Calculate multiple MAs for a dataset
  calculateMultipleMAs(priceData) {
    const prices = priceData.map(item => item.price);
    const result = {};

    this.maPeriods.forEach(period => {
      const ma = this.calculateSMA(prices, period);
      result[`ma${period}`] = ma;
    });

    return result;
  }

  // Calculate MA signals
  calculateMASignals(currentPrice, maValues) {
    const signals = {};

    Object.entries(maValues).forEach(([key, value]) => {
      if (value !== null) {
        signals[`above_${key}`] = currentPrice > value;
        signals[`${key}_value`] = Math.round(value * 100) / 100;
      }
    });

    return signals;
  }

  // Get MA ribbon data with caching
  async getMARibbon(symbol, timeframe) {
    const cacheKey = `ma_ribbon_${symbol}_${timeframe}`;
    
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`📊 Using cached MA ribbon for ${symbol}`);
      return cached;
    }

    try {
      // This would integrate with your existing price data service
      const cryptoDataService = require('../dataProviders/cryptoDataservice');
      const dataService = new cryptoDataService.CryptoDataService();
      
      let priceData;
      if (symbol.toUpperCase() === 'BTC') {
        priceData = await dataService.getBTCData(timeframe);
      } else {
        priceData = await dataService.getCryptoData(symbol, timeframe);
      }

      if (!priceData || !priceData.historical) {
        throw new Error('No price data available');
      }

      // Calculate MAs
      const maValues = this.calculateMultipleMAs(priceData.historical);
      const currentPrice = priceData.current.price;
      const signals = this.calculateMASignals(currentPrice, maValues);

      const result = {
        symbol: symbol.toUpperCase(),
        currentPrice,
        movingAverages: maValues,
        signals,
        lastUpdated: new Date().toISOString(),
        dataPoints: priceData.historical.length
      };

      // Cache with appropriate tier (6 hours for MA calculations as per optimization plan)
      await cacheService.setStable(cacheKey, result);
      console.log(`✅ Calculated MA ribbon for ${symbol} (${priceData.historical.length} data points)`);
      
      return result;

    } catch (error) {
      console.error(`❌ Error calculating MA ribbon for ${symbol}:`, error.message);
      
      // Return mock data if calculation fails
      const mockResult = this.generateMockMARibbon(symbol);
      await cacheService.setFrequent(cacheKey, mockResult); // Shorter cache for mock data
      console.log(`🎭 Using mock MA ribbon for ${symbol}`);
      
      return mockResult;
    }
  }

  // Generate mock MA ribbon data for fallback
  generateMockMARibbon(symbol) {
    const basePrice = symbol.toUpperCase() === 'BTC' ? 116000 : 3500;
    
    // Mock MA values (typically below current price in uptrend)
    const mockMAs = {
      ma20: basePrice * 0.98,   // Close to current price
      ma50: basePrice * 0.95,   // Slightly below
      ma100: basePrice * 0.90,  // More below
      ma200: basePrice * 0.85   // Support level
    };

    const signals = this.calculateMASignals(basePrice, mockMAs);

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: basePrice,
      movingAverages: mockMAs,
      signals,
      lastUpdated: new Date().toISOString(),
      dataPoints: 200, // Mock data points
      isMockData: true
    };
  }

  // Bulk calculate MAs for multiple symbols
  async getBulkMARibbons(symbols, timeframe = '7D') {
    const results = {};
    
    // Use Promise.all for parallel processing
    const promises = symbols.map(async (symbol) => {
      try {
        const result = await this.getMARibbon(symbol, timeframe);
        return { symbol, result };
      } catch (error) {
        console.error(`Failed to get MA ribbon for ${symbol}:`, error);
        return { symbol, result: null };
      }
    });

    const responses = await Promise.all(promises);
    
    responses.forEach(({ symbol, result }) => {
      results[symbol] = result;
    });

    console.log(`📊 Calculated MA ribbons for ${symbols.length} symbols`);
    return results;
  }

  // MA trend analysis
  analyzeMATrend(maValues) {
    const [ma20, ma50, ma100, ma200] = [
      maValues.ma20,
      maValues.ma50, 
      maValues.ma100,
      maValues.ma200
    ];

    let trendScore = 0;
    let trendDescription = 'Neutral';

    // Bullish alignment: shorter MAs above longer MAs
    if (ma20 > ma50) trendScore += 1;
    if (ma50 > ma100) trendScore += 1;
    if (ma100 > ma200) trendScore += 1;
    if (ma20 > ma200) trendScore += 1;

    if (trendScore >= 3) {
      trendDescription = 'Strong Bullish';
    } else if (trendScore === 2) {
      trendDescription = 'Bullish';
    } else if (trendScore === 1) {
      trendDescription = 'Weak Bullish';
    } else if (trendScore === 0) {
      trendDescription = 'Neutral';
    }

    return {
      score: trendScore,
      maxScore: 4,
      description: trendDescription,
      alignment: trendScore >= 2 ? 'bullish' : trendScore <= -2 ? 'bearish' : 'neutral'
    };
  }
}

module.exports = new MovingAverageService();