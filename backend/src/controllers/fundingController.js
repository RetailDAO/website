const { CryptoDataService } = require('../services/dataProviders/cryptoDataservice');

const cryptoService = new CryptoDataService();

const fundingController = {
  async getFundingRates(req, res, next) {
    try {
      const { exchange = 'all', symbol } = req.query;

      let fundingData = await cryptoService.getFundingRates(exchange);

      // Filter by symbol if provided
      if (symbol) {
        fundingData = fundingData.filter(item => 
          item.symbol.toLowerCase().includes(symbol.toLowerCase())
        );
      }

      // Sort by funding rate (highest first)
      fundingData.sort((a, b) => b.fundingRate - a.fundingRate);

      // Calculate statistics
      const stats = {
        totalPairs: fundingData.length,
        averageFundingRate: fundingData.reduce((sum, item) => sum + item.fundingRate, 0) / fundingData.length,
        highestRate: fundingData[0]?.fundingRate || 0,
        lowestRate: fundingData[fundingData.length - 1]?.fundingRate || 0,
        positiveRates: fundingData.filter(item => item.fundingRate > 0).length,
        negativeRates: fundingData.filter(item => item.fundingRate < 0).length
      };

      res.json({
        success: true,
        data: {
          rates: fundingData,
          statistics: stats,
          metadata: {
            exchange,
            lastUpdate: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = { fundingController };