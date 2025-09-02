const { CryptoDataService } = require('../services/dataProviders/cryptoDataservice');

const cryptoService = new CryptoDataService();

const fundingController = {
  async getFundingRates(req, res, next) {
    try {
      const { exchange = 'all', symbol } = req.query;

      const fundingResponse = await cryptoService.getFundingRates(exchange);
      
      // The service returns an object with btc, eth, and raw properties
      // Use the raw array for filtering and statistics
      let fundingData = fundingResponse.raw || [];

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
        averageFundingRate: fundingData.length > 0 ? 
          fundingData.reduce((sum, item) => sum + item.fundingRate, 0) / fundingData.length : 0,
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
          structured: {
            btc: fundingResponse.btc,
            eth: fundingResponse.eth
          },
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