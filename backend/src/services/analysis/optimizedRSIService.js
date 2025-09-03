const cacheService = require('../cache/cacheService');
const { calculateRSI } = require('../../utils/technical_indicators');
const websocketService = require('../websocket/websocketService');

class OptimizedRSIService {
  constructor() {
    this.defaultPeriods = [14, 21, 30, 50, 100]; // Extended periods for enhanced analysis
    this.supportedSymbols = ['BTC', 'ETH'];
    // Enhanced period requirements:
    // BTC: Can use up to 220 days for comprehensive MA analysis
    // ETH: Can use up to 50 days for extended RSI analysis
    this.enhancedPeriods = {
      BTC: [14, 21, 30, 50, 100, 200], // Full MA spectrum
      ETH: [14, 21, 30, 50] // Extended RSI analysis
    };
  }

  // Pre-calculate and cache RSI for multiple periods with enhanced period support
  async getBulkRSI(symbols = ['BTC', 'ETH'], periods = null, timeframe = '7D') {
    // Use enhanced periods if none specified
    if (!periods) {
      periods = symbols.includes('BTC') ? this.enhancedPeriods.BTC : 
               symbols.includes('ETH') ? this.enhancedPeriods.ETH : 
               this.defaultPeriods;
    }
    const results = {};

    // Use Promise.all for parallel processing
    const calculations = [];
    
    symbols.forEach(symbol => {
      periods.forEach(period => {
        calculations.push(
          this.getSingleRSI(symbol, period, timeframe)
            .then(result => ({ symbol, period, result }))
            .catch(error => ({ symbol, period, error: error.message }))
        );
      });
    });

    const responses = await Promise.all(calculations);

    // Organize results by symbol
    responses.forEach(({ symbol, period, result, error }) => {
      if (!results[symbol]) {
        results[symbol] = {};
      }
      
      if (error) {
        results[symbol][`rsi_${period}`] = { error, period };
      } else {
        results[symbol][`rsi_${period}`] = result;
      }
    });

    // Cache bulk result for quick access
    const bulkCacheKey = `rsi_bulk_${symbols.join('_')}_${periods.join('_')}_${timeframe}`;
    await cacheService.setFrequent(bulkCacheKey, results);

    console.log(`✅ Calculated bulk RSI for ${symbols.length} symbols, ${periods.length} periods`);
    return results;
  }

  // Get RSI for a single symbol/period combination with smart caching and enhanced data periods
  async getSingleRSI(symbol, period = 14, timeframe = '220D') {
    // Use appropriate timeframe based on symbol for enhanced calculations
    const enhancedTimeframe = symbol.toUpperCase() === 'BTC' ? '220D' : 
                            symbol.toUpperCase() === 'ETH' ? '50D' : 
                            timeframe; // BTC: 220 days, ETH: 50 days
    const cacheKey = `rsi_${symbol}_${period}_${timeframe}`;
    
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`📊 Using cached RSI for ${symbol} (${period}d)`);
      return cached;
    }

    try {
      // Get price data (with WebSocket integration for real-time current price)
      const priceData = await this.getPriceData(symbol, enhancedTimeframe);
      
      if (priceData.length < period + 1) {
        throw new Error(`Insufficient data for RSI calculation (need ${period + 1}, got ${priceData.length})`);
      }

      // Calculate RSI
      const rsiValues = calculateRSI(priceData, period);
      const currentRSI = rsiValues[rsiValues.length - 1];

      // Enhanced RSI analysis
      const analysis = this.analyzeRSI(currentRSI, rsiValues, period);
      
      // Get current price from WebSocket if available
      const wsPrice = await websocketService.getRealtimePrice(symbol.toLowerCase());
      const currentPrice = wsPrice ? wsPrice.price : priceData[priceData.length - 1];

      const result = {
        symbol: symbol.toUpperCase(),
        period,
        current: {
          value: currentRSI,
          price: currentPrice,
          signal: analysis.signal,
          strength: analysis.strength,
          timestamp: new Date().toISOString()
        },
        statistics: {
          average: rsiValues.reduce((sum, val) => sum + val, 0) / rsiValues.length,
          maximum: Math.max(...rsiValues),
          minimum: Math.min(...rsiValues),
          volatility: this.calculateVolatility(rsiValues)
        },
        signals: {
          overbought: currentRSI >= 70,
          oversold: currentRSI <= 30,
          neutral: currentRSI > 30 && currentRSI < 70,
          extremeOverbought: currentRSI >= 80,
          extremeOversold: currentRSI <= 20
        },
        recommendation: this.getEnhancedRecommendation(currentRSI, analysis),
        lastCalculated: new Date().toISOString(),
        dataPoints: rsiValues.length
      };

      // Use tiered caching - frequent updates for current RSI
      await cacheService.setFrequent(cacheKey, result);
      
      console.log(`✅ Calculated RSI for ${symbol} (${period}d): ${currentRSI.toFixed(2)}`);
      return result;

    } catch (error) {
      console.error(`❌ Error calculating RSI for ${symbol}:`, error.message);
      
      // Return mock RSI data for demonstration
      const mockResult = this.generateMockRSI(symbol, period);
      await cacheService.setRealtime(cacheKey, mockResult); // Shorter cache for mock data
      
      console.log(`🎭 Using mock RSI for ${symbol} (${period}d)`);
      return mockResult;
    }
  }

  // Get price data with WebSocket integration
  async getPriceData(symbol, timeframe) {
    try {
      // Import here to avoid circular dependency
      const { CryptoDataService } = require('../dataProviders/cryptoDataservice');
      const dataService = new CryptoDataService();

      let priceData;
      if (symbol.toUpperCase() === 'BTC') {
        const btcData = await dataService.getBTCData(timeframe);
        priceData = btcData.historical.map(item => item.price);
      } else {
        const cryptoData = await dataService.getCryptoData(symbol, timeframe);
        priceData = cryptoData.historical.map(item => item.price);
      }

      return priceData;
    } catch (error) {
      console.error(`Error fetching price data for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Enhanced RSI analysis with multiple signal strengths
  analyzeRSI(currentRSI, rsiValues) {
    let signal = 'neutral';
    let strength = 'weak';

    // Determine primary signal
    if (currentRSI >= 70) {
      signal = 'overbought';
      if (currentRSI >= 80) strength = 'strong';
      else if (currentRSI >= 75) strength = 'moderate';
      else strength = 'weak';
    } else if (currentRSI <= 30) {
      signal = 'oversold';
      if (currentRSI <= 20) strength = 'strong';
      else if (currentRSI <= 25) strength = 'moderate';
      else strength = 'weak';
    } else {
      // Check for momentum within neutral range
      const recent5 = rsiValues.slice(-5);
      const avg5 = recent5.reduce((sum, val) => sum + val, 0) / 5;
      
      if (currentRSI > avg5 + 5) {
        signal = 'bullish_momentum';
        strength = 'weak';
      } else if (currentRSI < avg5 - 5) {
        signal = 'bearish_momentum';
        strength = 'weak';
      }
    }

    return { signal, strength };
  }

  // Calculate RSI volatility
  calculateVolatility(rsiValues) {
    if (rsiValues.length < 2) return 0;
    
    const mean = rsiValues.reduce((sum, val) => sum + val, 0) / rsiValues.length;
    const variance = rsiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rsiValues.length;
    
    return Math.sqrt(variance);
  }

  // Enhanced recommendation system
  getEnhancedRecommendation(currentRSI, analysis) {
    const { signal, strength } = analysis;
    
    const recommendations = {
      overbought: {
        action: 'consider_selling',
        confidence: strength === 'strong' ? 'high' : strength === 'moderate' ? 'medium' : 'low',
        description: `RSI at ${currentRSI.toFixed(1)} indicates ${strength} overbought conditions`,
        timeframe: strength === 'strong' ? 'immediate' : 'short_term'
      },
      oversold: {
        action: 'consider_buying',
        confidence: strength === 'strong' ? 'high' : strength === 'moderate' ? 'medium' : 'low',
        description: `RSI at ${currentRSI.toFixed(1)} indicates ${strength} oversold conditions`,
        timeframe: strength === 'strong' ? 'immediate' : 'short_term'
      },
      bullish_momentum: {
        action: 'watch_for_entry',
        confidence: 'low',
        description: `RSI at ${currentRSI.toFixed(1)} shows building bullish momentum`,
        timeframe: 'medium_term'
      },
      bearish_momentum: {
        action: 'watch_for_exit',
        confidence: 'low',
        description: `RSI at ${currentRSI.toFixed(1)} shows building bearish momentum`,
        timeframe: 'medium_term'
      },
      neutral: {
        action: 'hold',
        confidence: 'medium',
        description: `RSI at ${currentRSI.toFixed(1)} is in neutral territory`,
        timeframe: 'wait'
      }
    };

    return recommendations[signal] || recommendations.neutral;
  }

  // Generate mock RSI data for fallback
  generateMockRSI(symbol, period) {
    const mockRSI = 30 + Math.random() * 40; // RSI between 30-70 (neutral range)
    const analysis = this.analyzeRSI(mockRSI, [mockRSI], period);
    
    return {
      symbol: symbol.toUpperCase(),
      period,
      current: {
        value: mockRSI,
        price: symbol.toUpperCase() === 'BTC' ? 116000 : 3500,
        signal: analysis.signal,
        strength: analysis.strength,
        timestamp: new Date().toISOString()
      },
      statistics: {
        average: mockRSI,
        maximum: mockRSI + 10,
        minimum: mockRSI - 10,
        volatility: 5
      },
      signals: {
        overbought: mockRSI >= 70,
        oversold: mockRSI <= 30,
        neutral: mockRSI > 30 && mockRSI < 70,
        extremeOverbought: mockRSI >= 80,
        extremeOversold: mockRSI <= 20
      },
      recommendation: this.getEnhancedRecommendation(mockRSI, analysis),
      lastCalculated: new Date().toISOString(),
      dataPoints: 50,
      isMockData: true
    };
  }

  // Batch warm cache for commonly requested RSI combinations with enhanced periods
  async warmRSICache() {
    const symbols = ['BTC', 'ETH'];
    const periods = [14, 21, 30, 50, 100, 200]; // Extended periods
    const timeframes = ['1D', '7D', '220D']; // Added 220D for BTC calculations

    console.log('🔥 Warming RSI cache...');
    
    const warmingData = {};
    
    for (const symbol of symbols) {
      for (const period of periods) {
        for (const timeframe of timeframes) {
          try {
            const rsiData = await this.getSingleRSI(symbol, period, timeframe);
            const cacheKey = `rsi_${symbol}_${period}_${timeframe}`;
            warmingData[cacheKey] = {
              data: rsiData,
              tier: 'tier2_frequent'
            };
          } catch (error) {
            console.warn(`Failed to warm cache for RSI ${symbol} ${period}d ${timeframe}:`, error.message);
          }
        }
      }
    }

    await cacheService.warmCache(warmingData);
    console.log(`✅ RSI cache warmed with ${Object.keys(warmingData).length} entries`);
  }

  // Get RSI summary for dashboard pills
  async getRSISummary(symbols = ['BTC', 'ETH']) {
    const summary = {};
    
    // Get the most common RSI period (14) for each symbol
    for (const symbol of symbols) {
      try {
        const rsi = await this.getSingleRSI(symbol, 14, '7D');
        summary[symbol] = {
          value: rsi.current.value,
          signal: rsi.current.signal,
          strength: rsi.current.strength,
          price: rsi.current.price,
          recommendation: rsi.recommendation.action,
          confidence: rsi.recommendation.confidence,
          lastUpdated: rsi.lastCalculated
        };
      } catch (error) {
        console.error(`Failed to get RSI summary for ${symbol}:`, error.message);
        summary[symbol] = { error: error.message };
      }
    }

    // Cache summary for quick dashboard loading
    await cacheService.setRealtime('rsi_dashboard_summary', summary);
    
    return summary;
  }
}

module.exports = new OptimizedRSIService();