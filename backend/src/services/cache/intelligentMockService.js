const goldenDatasetService = require('./goldenDatasetService');
const cacheService = require('./cacheService');

/**
 * Intelligent Mock Data Service
 * Generates realistic mock data based on golden dataset (real cached data)
 * Uses actual market patterns, correlations, and volatility characteristics
 */
class IntelligentMockService {
  constructor() {
    // Real market correlation matrix (based on historical analysis)
    this.correlations = {
      'BTC': { 'ETH': 0.75, 'SOL': 0.68, 'DXY': -0.35 },
      'ETH': { 'BTC': 0.75, 'SOL': 0.82, 'DXY': -0.28 },
      'SOL': { 'BTC': 0.68, 'ETH': 0.82, 'DXY': -0.25 }
    };

    // Real volatility characteristics (daily)
    this.volatilityProfiles = {
      'BTC': { daily: 0.025, weekly: 0.08, monthly: 0.15 },
      'ETH': { daily: 0.035, weekly: 0.10, monthly: 0.20 },
      'SOL': { daily: 0.055, weekly: 0.15, monthly: 0.30 },
      'DXY': { daily: 0.008, weekly: 0.015, monthly: 0.035 }
    };

    // Market cycle patterns
    this.marketCycles = {
      fear_greed_cycle: 45,   // days
      weekly_cycle: 7,        // days  
      monthly_cycle: 30,      // days
      quarterly_cycle: 90     // days
    };
  }

  /**
   * Generate intelligent mock data using golden dataset as foundation
   */
  async generateIntelligentMockData(symbol, timeframe, options = {}) {
    const {
      includeRSI = true,
      includeMA = true,
      includeVolume = true,
      forceRecalculation = false
    } = options;

    console.log(`🧠 Generating intelligent mock data for ${symbol} (${timeframe})`);

    try {
      // 1. Get golden dataset as baseline
      const golden = await this.getGoldenBaseline(symbol, timeframe);
      
      // 2. Apply market-realistic patterns
      const enhancedData = await this.applyMarketPatterns(symbol, golden, timeframe);
      
      // 3. Add technical indicators if requested
      if (includeRSI) {
        enhancedData.rsi = this.calculateRSIFromPrices(enhancedData.historical);
      }
      
      if (includeMA) {
        enhancedData.movingAverages = this.calculateMovingAverages(enhancedData.historical);
      }

      // 4. Add metadata for transparency
      enhancedData.dataSource = 'intelligent_mock';
      enhancedData.goldenSource = golden.source;
      enhancedData.generated = new Date().toISOString();
      enhancedData.confidence = golden.confidence;

      console.log(`✨ Generated intelligent ${symbol} data: ${enhancedData.historical.length} points, confidence: ${golden.confidence}%`);
      return enhancedData;

    } catch (error) {
      console.error(`❌ Intelligent mock generation failed for ${symbol}, using fallback:`, error.message);
      return this.generateFallbackMockData(symbol, timeframe);
    }
  }

  /**
   * Get golden dataset baseline with fallback strategies
   */
  async getGoldenBaseline(symbol, timeframe) {
    const dataType = `${symbol.toLowerCase()}_${timeframe}`;
    
    // Try to get golden dataset for exact timeframe
    let golden = await goldenDatasetService.retrieve(dataType, ['fresh', 'stale']);
    
    if (golden && golden.data) {
      return {
        data: golden.data,
        source: `golden_${dataType}`,
        tier: golden.metadata.tier,
        confidence: this.calculateConfidence(golden.metadata.tier, golden.metadata.age)
      };
    }

    // Fallback: try other timeframes for the same symbol
    const fallbackTimeframes = ['1D', '7D', '30D', '90D', '1Y'];
    for (const tf of fallbackTimeframes) {
      if (tf === timeframe) continue;
      
      const fallbackType = `${symbol.toLowerCase()}_${tf}`;
      golden = await goldenDatasetService.retrieve(fallbackType, ['fresh', 'stale', 'archived']);
      
      if (golden && golden.data) {
        console.log(`📊 Using ${tf} golden data as baseline for ${timeframe} request`);
        return {
          data: this.adaptTimeframe(golden.data, tf, timeframe),
          source: `golden_adapted_${fallbackType}`,
          tier: golden.metadata.tier,
          confidence: this.calculateConfidence(golden.metadata.tier, golden.metadata.age) * 0.8 // Reduce confidence for adapted data
        };
      }
    }

    // Final fallback: use any available golden data for correlation
    const allGolden = await goldenDatasetService.getAll();
    const availableData = Object.entries(allGolden).find(([key, info]) => 
      info.available && (key.includes('btc') || key.includes('eth') || key.includes('sol'))
    );

    if (availableData) {
      const [dataKey, info] = availableData;
      golden = await goldenDatasetService.retrieve(dataKey);
      
      if (golden && golden.data) {
        console.log(`🔄 Using ${dataKey} golden data with correlation adjustment for ${symbol}`);
        return {
          data: this.applyCorrelation(golden.data, dataKey.split('_')[0], symbol),
          source: `golden_correlated_${dataKey}`,
          tier: golden.metadata.tier,
          confidence: this.calculateConfidence(golden.metadata.tier, golden.metadata.age) * 0.6 // Lower confidence for correlated data
        };
      }
    }

    // No golden data available - create synthetic baseline
    console.log(`🎭 No golden data available for ${symbol}, creating synthetic baseline`);
    return {
      data: this.createSyntheticBaseline(symbol, timeframe),
      source: 'synthetic_baseline',
      tier: 'fallback',
      confidence: 30 // Low confidence for synthetic data
    };
  }

  /**
   * Apply realistic market patterns to baseline data
   */
  async applyMarketPatterns(symbol, baseline, timeframe) {
    const { data, confidence } = baseline;
    const volatilityProfile = this.volatilityProfiles[symbol.toUpperCase()] || this.volatilityProfiles['BTC'];
    const targetDays = this.timeframeToDays(timeframe);
    
    let basePrice = data.current?.price || this.getDefaultPrice(symbol);
    let baseVolume = data.current?.volume24h || this.getDefaultVolume(symbol);
    
    // Extract trend from golden data
    const trend = this.extractTrend(data.historical);
    
    // Generate time series with market patterns
    const historical = [];
    const now = new Date();
    
    for (let i = targetDays; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - i);
      
      // 1. Base price evolution with extracted trend
      const trendFactor = this.applyTrendFactor(trend, i, targetDays);
      
      // 2. Apply market cycles
      const cycleFactor = this.applyCyclicalPatterns(i, symbol);
      
      // 3. Apply realistic volatility
      const volatilityFactor = this.applyVolatilityPattern(volatilityProfile, timeframe, i);
      
      // 4. Apply correlation effects (if we have data from correlated assets)
      const correlationFactor = await this.applyCorrelationEffects(symbol, i, timestamp);
      
      // Combine all factors
      const price = basePrice * trendFactor * cycleFactor * volatilityFactor * correlationFactor;
      
      // Generate volume with inverse correlation to price stability
      const volumeMultiplier = 1 + Math.abs(volatilityFactor - 1) * 2; // Higher volume when more volatile
      const volume = baseVolume * volumeMultiplier * (0.8 + Math.random() * 0.4);
      
      historical.push({
        timestamp: timestamp.toISOString(),
        price: Math.round(price * 100) / 100,
        volume: Math.round(volume)
      });
    }
    
    // Calculate current metrics
    const current = this.calculateCurrentMetrics(historical, symbol);
    
    return {
      current,
      historical,
      trend: trend,
      confidence: confidence
    };
  }

  /**
   * Extract trend from historical golden data
   */
  extractTrend(historicalData) {
    if (!historicalData || historicalData.length < 2) {
      return { direction: 'neutral', strength: 0, pattern: 'consolidation' };
    }

    const prices = historicalData.map(h => h.price).filter(p => p && !isNaN(p));
    if (prices.length < 2) return { direction: 'neutral', strength: 0, pattern: 'consolidation' };

    // Calculate various trend metrics
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const overallChange = (lastPrice - firstPrice) / firstPrice;
    
    // Calculate recent trend (last 20% of data)
    const recentLength = Math.max(2, Math.floor(prices.length * 0.2));
    const recentPrices = prices.slice(-recentLength);
    const recentFirstPrice = recentPrices[0];
    const recentLastPrice = recentPrices[recentPrices.length - 1];
    const recentChange = (recentLastPrice - recentFirstPrice) / recentFirstPrice;
    
    // Determine trend direction and strength
    const direction = recentChange > 0.02 ? 'bullish' : recentChange < -0.02 ? 'bearish' : 'neutral';
    const strength = Math.abs(recentChange) * 100; // Convert to percentage
    
    // Detect pattern
    let pattern = 'consolidation';
    if (Math.abs(overallChange) > 0.1) pattern = 'trending';
    if (strength > 5) pattern = 'volatile';
    
    return { direction, strength, pattern, overallChange, recentChange };
  }

  /**
   * Apply trend factor to price evolution
   */
  applyTrendFactor(trend, dayIndex, totalDays) {
    if (!trend || trend.direction === 'neutral') return 1;
    
    const progressRatio = (totalDays - dayIndex) / totalDays; // 0 at start, 1 at end
    const trendIntensity = Math.min(trend.strength / 100, 0.1); // Cap at 10%
    
    if (trend.direction === 'bullish') {
      return 1 + (progressRatio * trendIntensity);
    } else if (trend.direction === 'bearish') {
      return 1 - (progressRatio * trendIntensity);
    }
    
    return 1;
  }

  /**
   * Apply cyclical market patterns
   */
  applyCyclicalPatterns(dayIndex, symbol) {
    let cycleFactor = 1;
    
    // Weekly cycle (lower volatility on weekends)
    const dayOfWeek = dayIndex % 7;
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
    
    // Monthly cycle (higher activity at month start/end)
    const dayOfMonth = dayIndex % 30;
    const monthlyFactor = (dayOfMonth < 3 || dayOfMonth > 27) ? 1.2 : 1.0;
    
    // Fear & Greed cycle (45-day psychological cycle)
    const fearGreedAngle = (dayIndex % this.marketCycles.fear_greed_cycle) * (2 * Math.PI / this.marketCycles.fear_greed_cycle);
    const fearGreedFactor = 1 + (Math.sin(fearGreedAngle) * 0.05); // ±5% influence
    
    return weekendFactor * monthlyFactor * fearGreedFactor;
  }

  /**
   * Apply realistic volatility patterns
   */
  applyVolatilityPattern(volatilityProfile, timeframe, dayIndex) {
    const baseVolatility = volatilityProfile.daily;
    
    // Random walk with mean reversion
    const randomComponent = (Math.random() - 0.5) * 2; // -1 to 1
    const volatilityFactor = randomComponent * baseVolatility;
    
    // Add occasional volatility spikes (0.5% chance per day)
    const spikeChance = Math.random();
    const spikeFactor = spikeChance < 0.005 ? (1 + (Math.random() - 0.5) * 0.1) : 1; // ±5% spikes
    
    return (1 + volatilityFactor) * spikeFactor;
  }

  /**
   * Apply correlation effects from other assets
   */
  async applyCorrelationEffects(symbol, dayIndex, timestamp) {
    // For now, return neutral correlation effect
    // This could be enhanced to look at actual price movements of correlated assets
    return 1;
  }

  /**
   * Calculate current market metrics from historical data
   */
  calculateCurrentMetrics(historical, symbol) {
    if (!historical.length) return null;
    
    const current = historical[historical.length - 1];
    const previous = historical[Math.max(0, historical.length - 2)];
    const dayAgo = historical[Math.max(0, historical.length - Math.min(24, historical.length - 1))];
    
    const change24h = ((current.price - dayAgo.price) / dayAgo.price) * 100;
    const marketCapMultiplier = this.getMarketCapMultiplier(symbol);
    
    return {
      price: current.price,
      change24h: change24h,
      volume24h: current.volume || this.getDefaultVolume(symbol),
      marketCap: current.price * marketCapMultiplier,
      timestamp: current.timestamp
    };
  }

  /**
   * Calculate RSI from price data
   */
  calculateRSIFromPrices(prices) {
    const rsi = {};
    
    [14, 21, 30].forEach(period => {
      if (prices.length >= period + 1) {
        const rsiData = [];
        
        for (let i = period; i < prices.length; i++) {
          const slice = prices.slice(i - period, i + 1);
          const rsiValue = this.calculateRSIForSlice(slice);
          
          if (rsiValue !== null) {
            rsiData.push({
              timestamp: prices[i].timestamp,
              value: rsiValue
            });
          }
        }
        
        rsi[period] = rsiData;
      }
    });
    
    return rsi;
  }

  /**
   * Calculate RSI for a specific slice of price data
   */
  calculateRSIForSlice(priceSlice) {
    if (priceSlice.length < 2) return null;
    
    let gains = [];
    let losses = [];
    
    for (let i = 1; i < priceSlice.length; i++) {
      const change = priceSlice[i].price - priceSlice[i - 1].price;
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }
    
    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;
    
    if (avgLoss === 0) return 100; // No losses = RSI of 100
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return Math.round(rsi * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Calculate moving averages from price data
   */
  calculateMovingAverages(prices) {
    const ma = {};
    
    [20, 50, 100, 200].forEach(period => {
      if (prices.length >= period) {
        const maData = [];
        
        for (let i = period - 1; i < prices.length; i++) {
          const slice = prices.slice(i - period + 1, i + 1);
          const average = slice.reduce((sum, p) => sum + p.price, 0) / slice.length;
          
          maData.push({
            timestamp: prices[i].timestamp,
            value: Math.round(average * 100) / 100
          });
        }
        
        ma[period] = maData;
      }
    });
    
    return ma;
  }

  /**
   * Helper methods for default values and calculations
   */
  calculateConfidence(tier, ageMinutes) {
    const baseTierConfidence = { fresh: 95, stale: 80, archived: 60, fallback: 40 };
    const baseConfidence = baseTierConfidence[tier] || 30;
    
    // Reduce confidence based on age
    const ageReduction = Math.min(ageMinutes / 60, 24) * 2; // Reduce 2% per hour, cap at 48%
    return Math.max(30, baseConfidence - ageReduction);
  }

  timeframeToDays(timeframe) {
    const mapping = { '1D': 1, '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };
    return mapping[timeframe] || 30;
  }

  getDefaultPrice(symbol) {
    const prices = { BTC: 67000, ETH: 3500, SOL: 200 };
    return prices[symbol.toUpperCase()] || 1000;
  }

  getDefaultVolume(symbol) {
    const volumes = { BTC: 25000000000, ETH: 15000000000, SOL: 1000000000 };
    return volumes[symbol.toUpperCase()] || 500000000;
  }

  getMarketCapMultiplier(symbol) {
    const multipliers = { BTC: 19700000, ETH: 120000000, SOL: 470000000 };
    return multipliers[symbol.toUpperCase()] || 100000000;
  }

  /**
   * Fallback mock generation when all else fails
   */
  generateFallbackMockData(symbol, timeframe) {
    const basePrice = this.getDefaultPrice(symbol);
    const days = this.timeframeToDays(timeframe);
    const historical = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - i);
      
      const randomVariation = (Math.random() - 0.5) * 0.04; // ±2%
      const price = basePrice * (1 + randomVariation);
      
      historical.push({
        timestamp: timestamp.toISOString(),
        price: Math.round(price * 100) / 100
      });
    }
    
    return {
      current: this.calculateCurrentMetrics(historical, symbol),
      historical,
      dataSource: 'fallback_mock',
      confidence: 20
    };
  }

  /**
   * Additional helper methods for timeframe adaptation and correlation
   */
  adaptTimeframe(data, sourceTimeframe, targetTimeframe) {
    // Simple adaptation - could be enhanced with interpolation
    return data;
  }

  applyCorrelation(sourceData, sourceSymbol, targetSymbol) {
    const correlation = this.correlations[sourceSymbol.toUpperCase()]?.[targetSymbol.toUpperCase()] || 0.3;
    const basePrice = this.getDefaultPrice(targetSymbol);
    
    if (sourceData.current) {
      const adaptedPrice = basePrice * (1 + (sourceData.current.change24h / 100) * correlation);
      return {
        ...sourceData,
        current: {
          ...sourceData.current,
          price: adaptedPrice
        }
      };
    }
    
    return sourceData;
  }

  createSyntheticBaseline(symbol, timeframe) {
    return this.generateFallbackMockData(symbol, timeframe);
  }
}

module.exports = new IntelligentMockService();