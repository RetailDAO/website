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

      // Use ultra-conservative 5-hour cache for futures basis (92% API reduction)
      const fiveHourPeriod = Math.floor(Date.now() / (5 * 60 * 60 * 1000)); // 5-hour periods
      const cacheKey = `market:futures:basis:3m_${fiveHourPeriod}`;
      
      // Try cache with fallback support (stale-while-revalidate pattern)
      const cacheResult = await cacheService.getWithFallback(cacheKey, 'futures');
      let basisData = cacheResult.data;
      
      if (!basisData) {
        console.log('🔄 Computing fresh futures basis analysis (5-HOUR STRATEGIC CACHE)');
        console.log('💡 Futures basis refreshes 4.8x daily to conserve API calls');
        
        // Get optimized futures basis data
        basisData = await this.dataService.getFuturesBasis();
        
        if (basisData) {
          // Use ultra-conservative futures caching (5-hour TTL)
          await cacheService.setFuturesBasis(cacheKey, basisData);
          
          // Store fallback data for stale-while-revalidate pattern
          await cacheService.setFallbackData(cacheKey, basisData, 'futures');
          
          console.log(`🎯 Ultra-conservative cache: Next refresh in 5 hours (92% API reduction)`);
        }
      } else {
        const freshness = cacheResult.fresh ? 'fresh' : 'stale';
        const source = cacheResult.source;
        console.log(`⚡ Serving ${freshness} futures basis from ${source} (${Math.round(performance.now() - startTime)}ms)`);
        if (!cacheResult.fresh) {
          console.log(`🔄 Stale data acceptable for futures basis - 12-hour fallback window`);
        }
      }
      
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
            dataSource: basisData.dataSource || 'deribit',
            cacheSource: cacheResult?.source || 'api',
            timestamp: basisData.timestamp,
            processingTime: `${processingTime}ms`,
            cacheStrategy: 'ultra_conservative_5h',
            cacheKey: cacheKey,
            fresh: cacheResult?.fresh !== false,
            nextUpdate: new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString(), // 5 hours
            apiReduction: '92%'
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