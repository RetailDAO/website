// Traditional market liquidity controller for Market Overview v2
const { MacroDataService } = require('../services/dataProviders/macroDataService');

const macroService = new MacroDataService();

const liquidityController = {
  // Market Overview v2: Liquidity Pulse endpoint for traditional markets
  async getLiquidityPulse(req, res, next) {
    try {
      const startTime = performance.now();
      const { timeframe = '30D' } = req.query;
      
      // Validate timeframe
      const validTimeframes = ['7D', '30D', '90D', '1Y'];
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timeframe. Use: 7D, 30D, 90D, or 1Y'
        });
      }
      
      // Use ultra-conservative 20-hour cache for liquidity pulse (95% API reduction)
      const twentyHourPeriod = Math.floor(Date.now() / (20 * 60 * 60 * 1000)); // 20-hour periods
      const cacheKey = `market:liquidity:us2y_${timeframe}_${twentyHourPeriod}`;
      
      // Get cache service and try cache with fallback support
      const cacheService = require('../services/cache/cacheService');
      const cacheResult = await cacheService.getWithFallback(cacheKey, 'liquidity');
      let result = cacheResult.data;
      
      if (!result) {
        console.log('🔄 Computing fresh Liquidity Pulse data for Market Overview v2');
        
        // Get liquidity data from FRED via macroDataService
        result = await macroService.getLiquidityData(timeframe);
        
        // Use ultra-conservative liquidity caching (20-hour TTL)
        await cacheService.setLiquidityPulse(cacheKey, result);
        
        // Store fallback data for stale-while-revalidate pattern
        await cacheService.setFallbackData(cacheKey, result, 'liquidity');
        
        console.log(`✅ Liquidity Pulse calculation completed in ${Math.round(performance.now() - startTime)}ms`);
        console.log(`🎯 Ultra-conservative cache: Next refresh in 20 hours (95% API reduction)`);
      } else {
        const freshness = cacheResult.fresh ? 'fresh' : 'stale';
        const source = cacheResult.source;
        result.metadata.fresh = cacheResult.fresh;
        console.log(`⚡ Serving ${freshness} liquidity data from ${source} (${Math.round(performance.now() - startTime)}ms)`);
        if (!cacheResult.fresh) {
          console.log(`🔄 Stale liquidity data acceptable - 48-hour fallback window`);
        }
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Liquidity Pulse endpoint error:', error.message);
      next(error);
    }
  },

  // Get Treasury yield data specifically
  async getTreasuryYields(req, res, next) {
    try {
      const { series = 'DGS2', timeframe = '30D' } = req.query;
      
      // Validate series
      const validSeries = ['DGS2', 'DGS10', 'DGS30', 'DFF']; // 2Y, 10Y, 30Y, Fed Funds
      if (!validSeries.includes(series)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid series. Use: DGS2, DGS10, DGS30, or DFF'
        });
      }

      const cacheKey = `treasury_${series}_${timeframe}`;
      const cacheService = require('../services/cache/cacheService');
      
      let result = await cacheService.get(cacheKey);
      if (!result) {
        result = await macroService.getTreasuryYield(series, timeframe);
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Treasury yields endpoint error:', error.message);
      next(error);
    }
  }
};

module.exports = { liquidityController };