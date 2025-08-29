const etfFlowsService = require('../services/analysis/etfFlowsService');
const { asyncHandler } = require('../middleware/errorHandler');

const etfController = {
  getFlows: asyncHandler(async (req, res) => {
    const { dateRange = '30D', etfFilter } = req.query;

    const validRanges = ['7D', '30D', '90D', '1Y'];
    if (!validRanges.includes(dateRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range. Use: 7D, 30D, 90D, or 1Y'
      });
    }

    try {
      // Use optimized ETF flows service with enhanced caching and multi-source fallbacks
      const etfData = await etfFlowsService.getETFFlows(dateRange, etfFilter);

      res.json({
        success: true,
        data: etfData
      });

    } catch (error) {
      console.error('Error fetching ETF flows:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ETF flows',
        error: error.message
      });
    }
  }),

  getETFSummary: asyncHandler(async (req, res) => {
    const { symbols } = req.query;
    
    try {
      // Get summary for specified ETFs or default ones
      const etfData = await etfFlowsService.getETFFlows('7D', symbols); // Last week summary
      
      // Extract summary for easy dashboard consumption
      const summary = {
        weeklyFlows: etfData.summary,
        topPerformers: etfData.summary.etfBreakdown.slice(0, 3),
        metadata: etfData.metadata
      };

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Error getting ETF summary:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to get ETF summary',
        error: error.message
      });
    }
  })
};

module.exports = { etfController };
