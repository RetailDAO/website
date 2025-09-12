/**
 * Optimized Futures Data Service
 * 
 * High-performance futures basis calculation service with:
 * - Deribit API integration with rate limiting
 * - Intelligent fallback to mock data
 * - Performance-optimized caching
 * - Error handling and graceful degradation
 */

const axios = require('axios');
const Bottleneck = require('bottleneck');
const cacheService = require('../cache/cacheService');

class OptimizedFuturesDataService {
  constructor() {
    // Deribit API rate limiting: 500 requests per minute
    this.deribitLimiter = new Bottleneck({
      reservoir: 500,
      reservoirRefreshAmount: 500,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
      maxConcurrent: 2
    });

    this.deribitBaseUrl = 'https://www.deribit.com/api/v2/public';
    this.requestTimeout = 5000; // 5 second timeout
  }

  /**
   * Get futures basis analysis with intelligent fallbacks
   */
  async getFuturesBasis() {
    const cacheKey = `futures_basis_${Math.floor(Date.now() / 600000)}`; // 10-minute cache

    return await cacheService.getOrFetch(cacheKey, async () => {
      try {
        console.log('🔍 [FuturesService] Fetching futures basis data...');

        // Parallel fetch for better performance
        const [spotData, futuresData] = await Promise.allSettled([
          this.getOptimizedSpotPrice('BTC'),
          this.getDeribitFuturesPrice('BTC-26DEC25') // Using 3-month futures as per client requirements
        ]);

        if (spotData.status === 'rejected' || futuresData.status === 'rejected') {
          console.warn('⚠️ [FuturesService] API calls failed, using fallback data');
          return await this.getFallbackBasisData();
        }

        const spot = spotData.value;
        const futures = futuresData.value;

        // Validate data
        if (!spot || !futures || spot <= 0 || futures.price <= 0) {
          console.warn('⚠️ [FuturesService] Invalid price data, using fallback');
          return await this.getFallbackBasisData();
        }

        // Calculate futures basis
        const daysToExpiry = this.calculateDaysToExpiry(futures.expiry);
        const annualizedBasis = this.calculateAnnualizedBasis(spot, futures.price, daysToExpiry);
        const regime = this.classifyBasisRegime(annualizedBasis);

        const result = {
          spotPrice: Math.round(spot * 100) / 100,
          futuresPrice: Math.round(futures.price * 100) / 100,
          daysToExpiry,
          annualizedBasis: Math.round(annualizedBasis * 100) / 100,
          regime: regime.state,
          regimeData: regime,
          expiry: futures.expiry,
          timestamp: Date.now(),
          dataSource: 'deribit'
        };

        console.log(`✅ [FuturesService] Basis: ${result.annualizedBasis}%, Regime: ${result.regime}`);
        
        // Cache fallback data for reliability
        await cacheService.set('futures_basis_fallback', result, 3600); // 1 hour fallback cache
        
        return result;

      } catch (error) {
        console.warn('🎭 [FuturesService] Error fetching data, using fallback:', error.message);
        return await this.getFallbackBasisData();
      }
    }, { ttl: 600 }); // 10 minutes cache
  }

  /**
   * Get spot price from Deribit index (most accurate for basis calculation)
   */
  async getOptimizedSpotPrice(symbol = 'BTC') {
    return this.deribitLimiter.schedule(async () => {
      const response = await axios.get(`${this.deribitBaseUrl}/get_index_price`, {
        params: { index_name: `${symbol.toLowerCase()}_usd` },
        timeout: this.requestTimeout
      });
      return response.data.result.index_price;
    });
  }

  /**
   * Get Deribit futures price with rate limiting
   */
  async getDeribitFuturesPrice(instrument = 'BTC-26DEC25') {
    return this.deribitLimiter.schedule(async () => {
      const response = await axios.get(`${this.deribitBaseUrl}/ticker`, {
        params: { instrument_name: instrument },
        timeout: this.requestTimeout
      });

      const data = response.data.result;
      
      return {
        price: data.last_price || data.mark_price, // Use last_price for actual futures
        expiry: 1766736000000, // Dec 26, 2025 timestamp for BTC-26DEC25
        instrumentName: instrument
      };
    });
  }

  /**
   * Calculate days to expiry
   */
  calculateDaysToExpiry(expiryTimestamp) {
    if (!expiryTimestamp) return 90; // Default to 90 days for perpetual
    
    const now = Date.now();
    const expiry = typeof expiryTimestamp === 'string' ? 
      new Date(expiryTimestamp).getTime() : expiryTimestamp;
    
    const daysToExpiry = Math.max(1, Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)));
    return daysToExpiry;
  }

  /**
   * Calculate annualized basis percentage
   */
  calculateAnnualizedBasis(spot, futures, daysToExpiry) {
    if (daysToExpiry <= 0 || spot <= 0) return 0;
    
    // For perpetual swaps, use funding rate approach
    if (daysToExpiry >= 90) {
      // Simplified basis calculation for perpetual contracts
      return ((futures - spot) / spot) * 100;
    }
    
    // Traditional futures basis calculation
    return ((futures - spot) / spot) * (365 / daysToExpiry) * 100;
  }

  /**
   * Classify basis regime according to Kevin's requirements
   * - Backwardation/Stress (🔴): Basis_ann ≤ 0%
   * - Healthy Contango (🟢): +5% to +12% 
   * - Overheated Carry (🔴): Basis_ann ≥ +15%
   * - Else (🟡): Neutral
   */
  classifyBasisRegime(basis) {
    if (basis <= 0) {
      return {
        state: 'backwardation',
        label: 'Backwardation/Stress',
        color: 'red',
        terminalLabel: '[STRESS]',
        description: 'Futures ≤ spot - supply constraints possible',
        sentiment: 'bearish'
      };
    } else if (basis >= 5 && basis <= 12) {
      return {
        state: 'healthy',
        label: 'Healthy Contango',
        color: 'green',
        terminalLabel: '[HEALTHY]',
        description: 'Normal market conditions with healthy premium',
        sentiment: 'bullish'
      };
    } else if (basis >= 15) {
      return {
        state: 'overheated',
        label: 'Overheated Carry',
        color: 'red',
        terminalLabel: '[OVERHEATED]',
        description: 'Excessive premium - potential correction ahead',
        sentiment: 'overheated'
      };
    } else {
      return {
        state: 'neutral',
        label: 'Neutral',
        color: 'yellow',
        terminalLabel: '[NEUTRAL]',
        description: 'Between healthy and stressed levels',
        sentiment: 'neutral'
      };
    }
  }

  /**
   * Fallback data for graceful degradation
   */
  async getFallbackBasisData() {
    // Try to get cached fallback first
    const cachedFallback = await cacheService.get('futures_basis_fallback');
    if (cachedFallback) {
      console.log('🎭 [FuturesService] Using cached fallback data');
      return { ...cachedFallback, dataSource: 'cached_fallback' };
    }

    // Generate realistic mock data
    const baseSpot = 67234;
    const spotVariation = (Math.random() - 0.5) * 2000;
    const spotPrice = baseSpot + spotVariation;
    
    const basisVariation = (Math.random() - 0.5) * 8; // ±4% variation
    const annualizedBasis = 8.2 + basisVariation;
    
    const futuresPrice = spotPrice * (1 + (annualizedBasis / 100) * (90 / 365));
    const regime = this.classifyBasisRegime(annualizedBasis);

    console.log('🎭 [FuturesService] Using generated mock data');

    return {
      spotPrice: Math.round(spotPrice * 100) / 100,
      futuresPrice: Math.round(futuresPrice * 100) / 100,
      daysToExpiry: 89 + Math.floor(Math.random() * 5),
      annualizedBasis: Math.round(annualizedBasis * 100) / 100,
      regime: regime.state,
      regimeData: regime,
      expiry: Date.now() + (90 * 24 * 60 * 60 * 1000),
      timestamp: Date.now(),
      dataSource: 'mock'
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.deribitBaseUrl}/get_time`, {
        timeout: 3000
      });
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        deribitTime: response.data.result,
        rateLimitStatus: {
          reservoir: this.deribitLimiter.reservoir,
          capacity: 500
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        fallbackAvailable: true
      };
    }
  }
}

// Export singleton instance
const optimizedFuturesDataService = new OptimizedFuturesDataService();
module.exports = { optimizedFuturesDataService };