const { CryptoDataService } = require('../services/dataProviders/cryptoDataservice');
const { calculateRSI, calculateMovingAverage } = require('../utils/technical_indicators');
const movingAverageService = require('../services/analysis/movingAverageService');

const cryptoService = new CryptoDataService();

const btcController = {
  async getAnalysis(req, res, next) {
    try {
      const { timeframe = '1D' } = req.query;

      // Validate timeframe - added support for 220D
      const validTimeframes = ['1D', '7D', '30D', '90D', '220D', '1Y'];
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timeframe. Use: 1D, 7D, 30D, 90D, 220D, or 1Y'
        });
      }

      const btcData = await cryptoService.getBTCData(timeframe);
      
      // Calculate technical indicators
      const prices = btcData.historical.map(item => item.price);
      const rsi = calculateRSI(prices);
      const ma20 = calculateMovingAverage(prices, 20);
      const ma50 = calculateMovingAverage(prices, 50);

      // Add indicators to historical data
      const enrichedData = btcData.historical.map((item, index) => ({
        ...item,
        rsi: rsi[index] || null,
        ma20: ma20[index] || null,
        ma50: ma50[index] || null
      }));

      // Calculate trend analysis
      const latestRSI = rsi[rsi.length - 1];
      const latestPrice = prices[prices.length - 1];
      const latestMA20 = ma20[ma20.length - 1];
      const latestMA50 = ma50[ma50.length - 1];

      const trendAnalysis = {
        trend: latestPrice > latestMA20 ? 'bullish' : 'bearish',
        strength: latestRSI ? Math.abs(latestRSI - 50) : null, // Distance from neutral RSI
        signals: {
          oversold: latestRSI ? latestRSI < 30 : false,
          overbought: latestRSI ? latestRSI > 70 : false,
          goldenCross: (latestMA20 && latestMA50) ? 
            (latestMA20 > latestMA50 && ma20[ma20.length - 2] <= ma50[ma50.length - 2]) : false
        },
        summary: generateAnalysisSummary(latestPrice, latestMA20, latestMA50, latestRSI)
      };

      res.json({
        success: true,
        data: {
          current: btcData.current,
          historical: enrichedData,
          analysis: trendAnalysis,
          metadata: {
            timeframe,
            lastUpdate: new Date().toISOString(),
            dataPoints: enrichedData.length
          }
        }
      });

    } catch (error) {
      next(error);
    }
  },

  async getCurrentPrice(req, res, next) {
    try {
      const btcData = await cryptoService.getBTCData('1D');
      res.json({
        success: true,
        data: btcData.current
      });
    } catch (error) {
      next(error);
    }
  },

  async getMARibbon(req, res, next) {
    try {
      const { timeframe = '7D', symbol = 'BTC' } = req.query;

      // Validate timeframe - added support for 220D
      const validTimeframes = ['1D', '7D', '30D', '90D', '220D', '1Y'];
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timeframe. Use: 1D, 7D, 30D, 90D, 220D, or 1Y'
        });
      }

      const maRibbonData = await movingAverageService.getMARibbon(symbol, timeframe);
      const trendAnalysis = movingAverageService.analyzeMATrend(maRibbonData.movingAverages);

      res.json({
        success: true,
        data: {
          ...maRibbonData,
          trendAnalysis,
          metadata: {
            timeframe,
            calculatedAt: new Date().toISOString(),
            periods: [20, 50, 100, 200]
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
};

function generateAnalysisSummary(price, ma20, ma50, rsi) {
  if (!price) return 'Price data not available';
  
  let summary = `Bitcoin is trading at $${price.toLocaleString()}. `;
  
  if (ma20 && ma50) {
    if (price > ma20 && price > ma50) {
      summary += 'Price is above both 20 and 50 day moving averages, indicating bullish momentum. ';
    } else if (price < ma20 && price < ma50) {
      summary += 'Price is below both moving averages, suggesting bearish pressure. ';
    } else {
      summary += 'Price is consolidating around moving averages. ';
    }
    
    if (ma20 > ma50) {
      summary += 'Short-term trend is bullish as 20-day MA is above 50-day MA. ';
    } else {
      summary += 'Short-term trend is bearish as 20-day MA is below 50-day MA. ';
    }
  }
  
  if (rsi) {
    if (rsi > 70) {
      summary += 'RSI indicates overbought conditions - potential for correction.';
    } else if (rsi < 30) {
      summary += 'RSI shows oversold conditions - potential buying opportunity.';
    } else {
      summary += `RSI at ${rsi.toFixed(1)} suggests balanced market conditions.`;
    }
  }
  
  return summary;
}

module.exports = { btcController };