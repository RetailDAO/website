/**
 * CoinGlass API Service
 *
 * Professional-grade CoinGlass API integration for leverage state data
 * Features:
 * - Intelligent rate limiting (100 calls/minute free tier)
 * - Automatic fallback to existing exchange APIs
 * - Circuit breaker protection
 * - Comprehensive error handling
 * - Easy API key implementation
 */

const axios = require('axios');
const rateLimitedApiService = require('../rateLimitedApi');

class CoinGlassService {
  constructor() {
    this.apiKey = process.env.COINGLASS_API_KEY;
    this.baseURL = 'https://open-api.coinglass.com/public/v2';
    this.limiter = rateLimitedApiService.limiters.coinglass;

    // Headers for API requests
    this.headers = {
      'accept': 'application/json',
      'coinglassSecret': this.apiKey || ''
    };

    console.log(this.apiKey ?
      '🔑 CoinGlass API key configured - ready for premium data' :
      '🎭 CoinGlass API key not found - using fallback data sources'
    );
  }

  /**
   * Check if CoinGlass API is available and configured
   */
  isApiAvailable() {
    return !!this.apiKey && this.apiKey !== 'your_coinglass_api_key';
  }

  /**
   * Get Bitcoin Open Interest data from CoinGlass
   * Endpoint: /openInterest
   */
  async getOpenInterest(symbol = 'BTC') {
    if (!this.isApiAvailable()) {
      throw new Error('CoinGlass API key not configured');
    }

    return this.limiter.schedule(async () => {
      const response = await axios.get(`${this.baseURL}/openInterest`, {
        headers: this.headers,
        params: {
          symbol: symbol,
          timeType: '24h'
        },
        timeout: 8000
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;

        return {
          totalOpenInterest: parseFloat(data.totalOpenInterest),
          change24h: parseFloat(data.change24h),
          exchanges: data.dataMap || [],
          timestamp: data.createTime,
          source: 'coinglass_api'
        };
      }

      throw new Error('Invalid CoinGlass OI response');
    });
  }

  /**
   * Get Bitcoin Funding Rates data from CoinGlass
   * Endpoint: /fundingRates
   */
  async getFundingRates(symbol = 'BTC') {
    if (!this.isApiAvailable()) {
      throw new Error('CoinGlass API key not configured');
    }

    return this.limiter.schedule(async () => {
      const response = await axios.get(`${this.baseURL}/fundingRates`, {
        headers: this.headers,
        params: {
          symbol: symbol,
          timeType: 'current'
        },
        timeout: 8000
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;

        // Calculate weighted average funding rate
        let totalRate = 0;
        let totalVolume = 0;
        const exchanges = [];

        data.dataMap.forEach(exchange => {
          const rate = parseFloat(exchange.rate);
          const volume = parseFloat(exchange.volume24h) || 1;

          exchanges.push({
            exchange: exchange.exchangeName,
            rate: rate,
            volume24h: volume
          });

          totalRate += rate * volume;
          totalVolume += volume;
        });

        const weightedAverageRate = totalVolume > 0 ? totalRate / totalVolume : 0;

        return {
          averageRate: weightedAverageRate,
          exchanges: exchanges,
          timestamp: data.updateTime,
          source: 'coinglass_api'
        };
      }

      throw new Error('Invalid CoinGlass funding rates response');
    });
  }

  /**
   * Get Bitcoin Long/Short Ratio data from CoinGlass
   * Endpoint: /longShortRatio
   */
  async getLongShortRatio(symbol = 'BTC') {
    if (!this.isApiAvailable()) {
      throw new Error('CoinGlass API key not configured');
    }

    return this.limiter.schedule(async () => {
      const response = await axios.get(`${this.baseURL}/longShortRatio`, {
        headers: this.headers,
        params: {
          symbol: symbol,
          timeType: '24h'
        },
        timeout: 8000
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;

        return {
          longRatio: parseFloat(data.longRatio),
          shortRatio: parseFloat(data.shortRatio),
          longShortRatio: parseFloat(data.longShortRatio),
          timestamp: data.updateTime,
          source: 'coinglass_api'
        };
      }

      throw new Error('Invalid CoinGlass long/short ratio response');
    });
  }

  /**
   * Get comprehensive leverage state data from CoinGlass
   * Combines multiple endpoints for complete analysis
   */
  async getComprehensiveLeverageData(symbol = 'BTC') {
    if (!this.isApiAvailable()) {
      throw new Error('CoinGlass API key not configured');
    }

    console.log('🔍 [CoinGlass] Fetching comprehensive leverage data...');
    const startTime = performance.now();

    try {
      // Fetch all relevant data in parallel
      const [oiData, frData, lsRatioData] = await Promise.allSettled([
        this.getOpenInterest(symbol),
        this.getFundingRates(symbol),
        this.getLongShortRatio(symbol)
      ]);

      const results = {
        openInterest: oiData.status === 'fulfilled' ? oiData.value : null,
        fundingRates: frData.status === 'fulfilled' ? frData.value : null,
        longShortRatio: lsRatioData.status === 'fulfilled' ? lsRatioData.value : null,
        metadata: {
          source: 'coinglass_comprehensive',
          fetchTime: Math.round(performance.now() - startTime),
          timestamp: Date.now(),
          successful: [oiData, frData, lsRatioData].filter(r => r.status === 'fulfilled').length
        }
      };

      console.log(`✅ [CoinGlass] Comprehensive data fetched in ${results.metadata.fetchTime}ms (${results.metadata.successful}/3 successful)`);

      return results;

    } catch (error) {
      console.error('❌ [CoinGlass] Comprehensive data fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Health check for CoinGlass API
   */
  async healthCheck() {
    if (!this.isApiAvailable()) {
      return {
        status: 'unavailable',
        reason: 'API key not configured',
        fallbackActive: true
      };
    }

    try {
      const startTime = Date.now();

      // Make a lightweight test request
      const response = await this.limiter.schedule(async () => {
        return await axios.get(`${this.baseURL}/openInterest`, {
          headers: this.headers,
          params: {
            symbol: 'BTC',
            timeType: '24h'
          },
          timeout: 5000
        });
      });

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency: `${latency}ms`,
        apiKeyValid: response.data.success,
        rateLimitRemaining: response.headers['x-ratelimit-remaining'] || 'unknown',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        fallbackRecommended: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get API usage statistics and rate limit status
   */
  getRateLimitStatus() {
    const limiterStats = this.limiter ? {
      running: this.limiter.running(),
      queued: this.limiter.queued(),
      reservoir: this.limiter.reservoir
    } : null;

    return {
      apiConfigured: this.isApiAvailable(),
      limiterStats,
      requestsPerMinute: 100, // Free tier limit
      upgradeRecommendation: !this.isApiAvailable() ? 'Configure COINGLASS_API_KEY for premium data' : null
    };
  }
}

// Export singleton instance
const coinGlassService = new CoinGlassService();

module.exports = { coinGlassService };