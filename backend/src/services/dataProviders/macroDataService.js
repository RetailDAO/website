// Performance-optimized macro economic data service for LiquidityPulseCard
const axios = require('axios');
const config = require('../../config/environment');
const cacheService = require('../cache/cacheService');

class MacroDataService {
  constructor() {
    this.fredClient = axios.create({
      baseURL: config.FRED_BASE_URL,
      timeout: 10000 // 10 second timeout for performance
    });
    
    // FRED API has generous rate limits (120 requests per minute)
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // 0.5 seconds between requests
  }

  async getLiquidityData(timeframe = '30D') {
    const startTime = performance.now();
    console.log(`🔄 Fetching liquidity data for ${timeframe} from FRED`);
    
    try {
      // Get Treasury 2-Year yield data from FRED (DGS2 series)
      const treasury2Y = await this.getTreasuryYield('DGS2', timeframe);
      
      // Calculate liquidity pulse based on Treasury data
      const liquidityPulse = this.calculateLiquidityPulse(treasury2Y, timeframe);
      
      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ Liquidity data compiled in ${duration}ms`);
      
      return {
        treasury2Y,
        pulse: liquidityPulse,
        metadata: {
          timeframe,
          calculatedAt: new Date().toISOString(),
          processingTime: duration,
          dataPoints: treasury2Y?.data?.length || 0,
          source: 'fred'
        }
      };

    } catch (error) {
      console.error('❌ Macro data service error:', error.message);
      return this.getFallbackLiquidityData(timeframe);
    }
  }

  async getTreasuryYield(seriesId = 'DGS2', timeframe = '30D') {
    const cacheKey = `fred_${seriesId}_${timeframe}`;
    
    // Try cache first for performance
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`⚡ Using cached FRED ${seriesId} data`);
      return cached;
    }

    await this.enforceRateLimit();

    try {
      // Calculate date range for FRED API
      const endDate = new Date();
      const startDate = new Date();
      const days = this.timeframeToDays(timeframe);
      startDate.setDate(endDate.getDate() - days);
      
      const startDateStr = this.formatDateForFRED(startDate);
      const endDateStr = this.formatDateForFRED(endDate);

      console.log(`📊 Fetching FRED ${seriesId} from ${startDateStr} to ${endDateStr}`);

      // FRED series observations endpoint
      const response = await this.fredClient.get('/series/observations', {
        params: {
          series_id: seriesId,
          api_key: config.FRED_API_KEY,
          file_type: 'json',
          observation_start: startDateStr,
          observation_end: endDateStr,
          sort_order: 'desc', // Most recent first
          limit: Math.min(days + 10, 1000) // Buffer for weekends/holidays
        }
      });

      if (!response.data || !response.data.observations) {
        throw new Error('Invalid FRED response');
      }

      // Process FRED observations
      const observations = response.data.observations
        .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value))) // Filter out missing data
        .map(obs => ({
          date: obs.date,
          yield: parseFloat(obs.value),
          timestamp: new Date(obs.date + 'T00:00:00.000Z').toISOString()
        }))
        .reverse(); // Chronological order (oldest first)

      if (observations.length === 0) {
        throw new Error('No valid Treasury yield data found');
      }

      const result = {
        seriesId,
        name: '2-Year Treasury Constant Maturity Rate',
        current: observations[observations.length - 1],
        data: observations,
        source: 'fred',
        metadata: {
          seriesInfo: response.data.series_id || seriesId,
          dataPoints: observations.length,
          startDate: observations[0]?.date,
          endDate: observations[observations.length - 1]?.date
        }
      };

      // Cache for 30 minutes (Treasury data updates daily on business days)
      await cacheService.set(cacheKey, result, 1800);
      console.log(`✅ Retrieved FRED ${seriesId} (${observations.length} points)`);
      
      return result;

    } catch (error) {
      console.error(`❌ Error fetching FRED ${seriesId}:`, error.message);
      return this.getMockTreasuryData(seriesId, timeframe);
    }
  }

  calculateLiquidityPulse(treasuryData, timeframe) {
    try {
      if (!treasuryData?.data || treasuryData.data.length < 7) {
        console.log('⚠️ Insufficient data for liquidity pulse calculation');
        return {
          score: 50,
          level: 'neutral',
          signals: { treasury: 'insufficient_data' },
          description: 'Insufficient data for analysis'
        };
      }

      const data = treasuryData.data;
      const current = data[data.length - 1];
      const currentYield = current.yield;

      // Calculate moving averages for trend analysis
      const last7Days = data.slice(-7);
      const last30Days = data.slice(-30);
      
      const avg7Day = last7Days.reduce((sum, item) => sum + item.yield, 0) / last7Days.length;
      const avg30Day = last30Days.length > 0 
        ? last30Days.reduce((sum, item) => sum + item.yield, 0) / last30Days.length
        : avg7Day;

      let pulseScore = 50; // Neutral baseline
      let signals = {
        treasury: 'neutral',
        trend: 'neutral',
        level: 'neutral'
      };

      // Analyze yield level (higher yields = tighter liquidity)
      if (currentYield > 5.5) {
        pulseScore -= 25; // Very tight liquidity
        signals.level = 'high_yields';
      } else if (currentYield > 4.5) {
        pulseScore -= 15; // Moderately tight
        signals.level = 'elevated_yields';
      } else if (currentYield < 3.0) {
        pulseScore += 20; // Loose liquidity
        signals.level = 'low_yields';
      } else if (currentYield < 4.0) {
        pulseScore += 10; // Moderately loose
        signals.level = 'moderate_yields';
      }

      // Calculate 30-day ago value for proper basis points calculation
      const thirtyDaysAgo = data.length >= 30 ? data[data.length - 30] : data[0];
      const thirtyDaysAgoYield = thirtyDaysAgo.yield;

      // Analyze trend (rising yields = tightening liquidity)
      const trendVs7Day = (currentYield - avg7Day) / avg7Day;
      const trendVs30Day = (currentYield - avg30Day) / avg30Day;

      // Calculate 30-day change in basis points (bp = yield difference * 100)
      const change30DayBps = Math.round((currentYield - thirtyDaysAgoYield) * 100);

      if (trendVs7Day > 0.05) { // 5% increase vs 7-day avg
        pulseScore -= 15;
        signals.trend = 'rapid_tightening';
      } else if (trendVs7Day > 0.02) { // 2% increase
        pulseScore -= 10;
        signals.trend = 'tightening';
      } else if (trendVs7Day < -0.05) { // 5% decrease
        pulseScore += 15;
        signals.trend = 'rapid_easing';
      } else if (trendVs7Day < -0.02) { // 2% decrease
        pulseScore += 10;
        signals.trend = 'easing';
      }

      // 30-day trend confirmation
      if (trendVs30Day > 0.1) { // Sustained increase
        pulseScore -= 10;
        signals.treasury = 'sustained_tightening';
      } else if (trendVs30Day < -0.1) { // Sustained decrease
        pulseScore += 10;
        signals.treasury = 'sustained_easing';
      }

      // Normalize score (0-100)
      pulseScore = Math.max(0, Math.min(100, pulseScore));

      const result = {
        score: Math.round(pulseScore),
        level: this.getPulseLevelFromScore(pulseScore),
        signals,
        analysis: {
          currentYield: currentYield,
          avg7Day: Math.round(avg7Day * 100) / 100,
          avg30Day: Math.round(avg30Day * 100) / 100,
          trend7Day: Math.round(trendVs7Day * 10000) / 100, // basis points
          trend30Day: change30DayBps, // basis points using subtraction
          thirtyDaysAgoYield: Math.round(thirtyDaysAgoYield * 100) / 100
        },
        description: this.getPulseDescription(pulseScore, signals)
      };

      console.log(`📈 Liquidity Pulse: ${result.score} (${result.level}) - 2Y@${currentYield}%`);
      return result;

    } catch (error) {
      console.error('❌ Error calculating liquidity pulse:', error.message);
      return {
        score: 50,
        level: 'neutral',
        signals: { treasury: 'calculation_error' },
        description: 'Unable to calculate liquidity conditions'
      };
    }
  }

  getPulseLevelFromScore(score) {
    if (score >= 75) return 'abundant';
    if (score >= 60) return 'adequate'; 
    if (score >= 40) return 'neutral';
    if (score >= 25) return 'tightening';
    return 'constrained';
  }

  getPulseDescription(score, signals) {
    const level = this.getPulseLevelFromScore(score);
    
    const descriptions = {
      abundant: 'Abundant liquidity - Low yields supportive of risk assets',
      adequate: 'Adequate liquidity - Generally supportive environment', 
      neutral: 'Neutral liquidity - Balanced yield environment',
      tightening: 'Tightening liquidity - Rising yields signal caution',
      constrained: 'Constrained liquidity - High yields pressure risk assets'
    };

    return descriptions[level] || 'Unknown liquidity conditions';
  }

  getFallbackLiquidityData(timeframe) {
    console.log('🎭 Using fallback liquidity data');
    
    const mockTreasury = this.getMockTreasuryData('DGS2', timeframe);
    
    return {
      treasury2Y: mockTreasury,
      pulse: {
        score: 50,
        level: 'neutral', 
        signals: { treasury: 'fallback_data' },
        description: 'Using fallback data - conditions unknown'
      },
      metadata: {
        timeframe,
        calculatedAt: new Date().toISOString(),
        processingTime: 0,
        dataPoints: this.timeframeToDays(timeframe),
        source: 'fallback'
      }
    };
  }

  getMockTreasuryData(seriesId, timeframe) {
    const days = this.timeframeToDays(timeframe);
    const mockData = [];
    
    // Realistic 2-year Treasury yield around 4.5-5.5%
    let baseYield = 5.0;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Skip weekends for Treasury data (business days only)
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }
      
      // Small daily variations for Treasury yields
      const variation = (Math.random() - 0.5) * 0.08; // ±0.04% daily variation
      baseYield += variation * 0.1; // Gradual drift
      
      mockData.push({
        date: this.formatDateForFRED(date),
        yield: parseFloat(Math.max(0.1, baseYield).toFixed(3)),
        timestamp: new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString()
      });
    }

    return {
      seriesId,
      name: '2-Year Treasury Constant Maturity Rate (Mock)',
      current: mockData[mockData.length - 1],
      data: mockData,
      source: 'mock',
      metadata: {
        seriesInfo: seriesId,
        dataPoints: mockData.length,
        startDate: mockData[0]?.date,
        endDate: mockData[mockData.length - 1]?.date
      }
    };
  }

  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  timeframeToDays(timeframe) {
    const mapping = {
      '7D': 10,   // Buffer for weekends
      '30D': 45,  // Buffer for weekends/holidays
      '90D': 120, // Buffer for weekends/holidays
      '1Y': 400   // Buffer for weekends/holidays
    };
    return mapping[timeframe] || 45;
  }

  formatDateForFRED(date) {
    // FRED expects YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  }
}

module.exports = { MacroDataService };