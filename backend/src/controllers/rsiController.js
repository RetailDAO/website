const optimizedRSIService = require('../services/analysis/optimizedRSIService');
const { asyncHandler } = require('../middleware/errorHandler');

const rsiController = {
  getRSI: asyncHandler(async (req, res) => {
    const { symbol, timeframe = '7D', period = 14 } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol parameter is required'
      });
    }

    const validTimeframes = ['1D', '7D', '30D', '90D'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Use: 1D, 7D, 30D, or 90D'
      });
    }

    const rsiPeriod = parseInt(period);
    if (isNaN(rsiPeriod) || rsiPeriod < 2 || rsiPeriod > 200) {
      return res.status(400).json({
        success: false,
        message: 'RSI period must be between 2 and 200 (supports enhanced MA calculations)'
      });
    }

    try {
      // Use optimized RSI service with enhanced caching and batch processing
      const rsiData = await optimizedRSIService.getSingleRSI(symbol.toUpperCase(), rsiPeriod, timeframe);
      
      res.json({
        success: true,
        data: rsiData
      });

    } catch (error) {
      console.error(`Error calculating RSI for ${symbol}:`, error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate RSI',
        error: error.message
      });
    }
  }),

  // New endpoint for bulk RSI calculations
  getBulkRSI: asyncHandler(async (req, res) => {
    const { symbols, periods, timeframe = '7D' } = req.query;

    const symbolList = symbols ? symbols.split(',').map(s => s.trim().toUpperCase()) : ['BTC', 'ETH'];
    const periodList = periods ? periods.split(',').map(p => parseInt(p.trim())) : [14, 21, 30];

    // Validate periods with enhanced limits
    if (periodList.some(p => isNaN(p) || p < 2 || p > 200)) {
      return res.status(400).json({
        success: false,
        message: 'All RSI periods must be between 2 and 200 (supports enhanced MA calculations)'
      });
    }

    try {
      const bulkRSI = await optimizedRSIService.getBulkRSI(symbolList, periodList, timeframe);
      
      res.json({
        success: true,
        data: bulkRSI,
        metadata: {
          symbols: symbolList,
          periods: periodList,
          timeframe,
          lastUpdate: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error calculating bulk RSI:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate bulk RSI',
        error: error.message
      });
    }
  }),

  // Dashboard summary endpoint
  getRSISummary: asyncHandler(async (req, res) => {
    const { symbols } = req.query;
    const symbolList = symbols ? symbols.split(',').map(s => s.trim().toUpperCase()) : ['BTC', 'ETH'];

    try {
      const summary = await optimizedRSIService.getRSISummary(symbolList);
      
      res.json({
        success: true,
        data: summary,
        metadata: {
          symbols: symbolList,
          lastUpdate: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting RSI summary:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to get RSI summary',
        error: error.message
      });
    }
  }),

  checkDivergence: (prices, rsiValues) => {
    // Simple divergence check - compare last 5 vs previous 5 data points
    if (prices.length < 10 || rsiValues.length < 10) return null;
    
    const recentPrices = prices.slice(-5);
    const recentRSI = rsiValues.slice(-5);
    
    const priceUptrend = recentPrices[4] > recentPrices[0];
    const rsiUptrend = recentRSI[4] > recentRSI[0];
    
    if (priceUptrend && !rsiUptrend) return 'bearish_divergence';
    if (!priceUptrend && rsiUptrend) return 'bullish_divergence';
    return null;
  },

  getRecommendation: (currentRSI, signal) => {
    if (signal === 'overbought') {
      return {
        action: 'consider_selling',
        confidence: currentRSI >= 80 ? 'high' : 'medium',
        description: 'RSI indicates potential selling pressure'
      };
    } else if (signal === 'oversold') {
      return {
        action: 'consider_buying',
        confidence: currentRSI <= 20 ? 'high' : 'medium',
        description: 'RSI indicates potential buying opportunity'
      };
    }
    return {
      action: 'hold',
      confidence: 'low',
      description: 'RSI in neutral range, no strong signal'
    };
  }
};

module.exports = { rsiController };