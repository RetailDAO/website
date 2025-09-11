// Streamlined API service for Market Overview v2
// Removed legacy endpoints, keeping only what's needed for the new Bloomberg terminal interface

class APIService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    this.requestTimeout = 10000; // 10 seconds
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache for most data
  }

  // Core request method with improved error handling
  async request(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    const cachedData = this.cache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      console.log(`📦 [Cache] ${endpoint}`);
      return cachedData.data;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      console.log(`🌐 [API] ${endpoint}`);
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      console.error(`❌ API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  // Clear cache method
  clearCache() {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  // ========== MARKET OVERVIEW V2 ENDPOINTS ==========

  // Moving Averages (Priority 1)
  async getMovingAverages() {
    return this.request('/api/v1/market-overview/moving-averages');
  }

  // Liquidity Pulse (Priority 2)
  async getLiquidityPulse(timeframe = '90D') {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request(`/api/v1/market-overview/liquidity-pulse${params}`);
  }

  // State of Leverage (Priority 3)
  async getLeverageState() {
    return this.request('/api/v1/market-overview/leverage-state');
  }

  // Futures Basis (Priority 4)
  async getFuturesBasis() {
    return this.request('/api/v1/market-overview/futures-basis');
  }

  // Futures Health Check (for development/monitoring)
  async getFuturesHealth() {
    return this.request('/api/v1/market-overview/futures-basis/health');
  }

  // Clear Futures Cache (for development)
  async clearFuturesCache() {
    return this.request('/api/v1/market-overview/futures-basis/cache', {
      method: 'DELETE',
    });
  }

  // ========== UTILITY ENDPOINTS ==========

  // Health Check
  async getHealth() {
    return this.request('/api/v1/health');
  }

  // ========== DEVELOPMENT HELPERS ==========

  // Get all Market Overview data in one call (for development/testing)
  async getAllMarketOverviewData() {
    try {
      const [movingAverages, liquidityPulse, leverageState, futuresBasis] = await Promise.allSettled([
        this.getMovingAverages(),
        this.getLiquidityPulse(),
        this.getLeverageState(),
        this.getFuturesBasis(),
      ]);

      return {
        movingAverages: movingAverages.status === 'fulfilled' ? movingAverages.value : null,
        liquidityPulse: liquidityPulse.status === 'fulfilled' ? liquidityPulse.value : null,
        leverageState: leverageState.status === 'fulfilled' ? leverageState.value : null,
        futuresBasis: futuresBasis.status === 'fulfilled' ? futuresBasis.value : null,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Failed to fetch all market overview data:', error);
      throw error;
    }
  }

  // Performance monitoring for development
  async measurePerformance(endpoint, operation) {
    const startTime = performance.now();
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ [Performance] ${endpoint}: ${duration.toFixed(2)}ms`);
      
      if (duration > 1000) {
        console.warn(`⚠️ [Performance] Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`❌ [Performance] ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new APIService();

export default apiService;