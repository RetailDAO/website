/**
 * Futures Controller
 * 
 * High-performance controller for futures basis analysis
 * Optimized for Market Overview v2 with caching and error handling
 */

const { optimizedFuturesDataService } = require('../services/dataProviders/futuresDataService');
const cacheService = require('../services/cache/cacheService');

class FuturesController {
  constructor() {
    this.dataService = optimizedFuturesDataService;
  }

  /**
   * Get futures basis analysis for Market Overview v2
   * Endpoint: GET /api/v1/market-overview/futures-basis
   */
  async getFuturesBasis(req, res) {
    const startTime = performance.now();
    
    try {
      console.log('📊 [FuturesController] Getting futures basis analysis...');

      // Get optimized futures basis data
      const basisData = await this.dataService.getFuturesBasis();
      
      if (!basisData) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch futures basis data',
          timestamp: new Date().toISOString()
        });
      }

      const processingTime = Math.round(performance.now() - startTime);
      console.log(`✅ [FuturesController] Futures basis analysis completed in ${processingTime}ms`);

      // Enhanced response with metadata
      res.json({
        success: true,
        data: {
          spotPrice: basisData.spotPrice,
          futuresPrice: basisData.futuresPrice,
          daysToExpiry: basisData.daysToExpiry,
          annualizedBasis: basisData.annualizedBasis,
          regime: basisData.regime,
          regimeData: basisData.regimeData,
          expiry: basisData.expiry,
          metadata: {
            dataSource: basisData.dataSource,
            timestamp: basisData.timestamp,
            processingTime: `${processingTime}ms`,
            cacheKey: `futures_basis_${Math.floor(Date.now() / 600000)}`,
            nextUpdate: new Date(Date.now() + (10 * 60 * 1000)).toISOString() // 10 minutes
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const processingTime = Math.round(performance.now() - startTime);
      console.error('❌ [FuturesController] Error in getFuturesBasis:', error.message);

      // Try to return cached data as emergency fallback
      try {
        const fallbackData = await cacheService.get('futures_basis_fallback');
        if (fallbackData) {
          console.log('🚨 [FuturesController] Using emergency fallback data');
          return res.json({
            success: true,
            data: {
              ...fallbackData,
              metadata: {
                dataSource: 'emergency_fallback',
                timestamp: fallbackData.timestamp,
                processingTime: `${processingTime}ms`,
                fallbackReason: error.message
              }
            },
            warning: 'Using cached fallback data due to API issues',
            timestamp: new Date().toISOString()
          });
        }
      } catch (fallbackError) {
        console.error('❌ [FuturesController] Fallback also failed:', fallbackError.message);
      }

      res.status(500).json({
        success: false,
        message: 'Futures basis service temporarily unavailable',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get futures service health status
   * Endpoint: GET /api/v1/market-overview/futures-basis/health
   */
  async getFuturesHealth(req, res) {
    try {
      const healthStatus = await this.dataService.healthCheck();
      
      res.json({
        success: true,
        data: healthStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clear futures cache (for testing/debugging)
   * Endpoint: DELETE /api/v1/market-overview/futures-basis/cache
   */
  async clearFuturesCache(req, res) {
    try {
      const cacheKeys = [
        `futures_basis_${Math.floor(Date.now() / 600000)}`,
        `futures_basis_${Math.floor((Date.now() - 600000) / 600000)}`,
        'futures_basis_fallback'
      ];

      let clearedCount = 0;
      for (const key of cacheKeys) {
        const cleared = await cacheService.delete(key);
        if (cleared) clearedCount++;
      }

      res.json({
        success: true,
        message: `Cleared ${clearedCount} futures cache entries`,
        clearedKeys: cacheKeys,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Create and export controller instance
const futuresControllerInstance = new FuturesController();

module.exports = {
  futuresController: {
    getFuturesBasis: futuresControllerInstance.getFuturesBasis.bind(futuresControllerInstance),
    getFuturesHealth: futuresControllerInstance.getFuturesHealth.bind(futuresControllerInstance),
    clearFuturesCache: futuresControllerInstance.clearFuturesCache.bind(futuresControllerInstance)
  }
};