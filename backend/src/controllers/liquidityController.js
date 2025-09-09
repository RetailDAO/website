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
      
      // Use enhanced cache with 30-minute TTL for FRED data (updates daily)
      const cacheKey = `liquidity_pulse_v2_${timeframe}_${Math.floor(Date.now() / 1800000)}`; // 30min cache
      
      // Try to get cached data first
      const cacheService = require('../services/cache/cacheService');
      let result = await cacheService.get(cacheKey);
      
      if (!result) {
        console.log('🔄 Computing fresh Liquidity Pulse data for Market Overview v2');
        
        // Get liquidity data from FRED via macroDataService
        result = await macroService.getLiquidityData(timeframe);
        
        // Cache for 30 minutes (FRED data updates once daily)
        await cacheService.set(cacheKey, result, 1800);
        console.log(`✅ Liquidity Pulse calculation completed in ${Math.round(performance.now() - startTime)}ms`);
      } else {
        result.metadata.fresh = false;
        console.log(`⚡ Serving cached Liquidity Pulse data (${Math.round(performance.now() - startTime)}ms)`);
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