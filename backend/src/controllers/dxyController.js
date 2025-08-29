const { TraditionalDataService } = require('../services/dataProviders/traditionalDataservice');
const { calculateRSI, calculateMovingAverage } = require('../utils/technical_indicators');
const { asyncHandler } = require('../middleware/errorHandler');

const traditionalService = new TraditionalDataService();

const dxyController = {
  getAnalysis: asyncHandler(async (req, res) => {
    const { timeframe = '1D' } = req.query;

    const validTimeframes = ['1D', '7D', '30D', '90D'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Use: 1D, 7D, 30D, or 90D'
      });
    }

    const dxyData = await traditionalService.getDXYData(timeframe);
    
    // Calculate technical indicators
    const prices = dxyData.map(item => item.price);
    const rsi = calculateRSI(prices);
    const ma20 = calculateMovingAverage(prices, 20);
    const ma50 = calculateMovingAverage(prices, 50);

    // Add indicators to historical data
    const enrichedData = dxyData.map((item, index) => ({
      ...item,
      rsi: rsi[index] || null,
      ma20: ma20[index] || null,
      ma50: ma50[index] || null
    }));

    // Calculate DXY strength analysis
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - 2];
    const change24h = ((currentPrice - previousPrice) / previousPrice) * 100;

    const analysis = {
      strength: currentPrice > ma20[ma20.length - 1] ? 'strong' : 'weak',
      trend: change24h > 0 ? 'bullish' : 'bearish',
      change24h: change24h,
      rsiSignal: rsi[rsi.length - 1] > 70 ? 'overbought' : 
        rsi[rsi.length - 1] < 30 ? 'oversold' : 'neutral',
      dollarImpact: {
        crypto: currentPrice > ma20[ma20.length - 1] ? 'negative' : 'positive',
        description: currentPrice > ma20[ma20.length - 1] 
          ? 'Strong dollar typically pressures crypto prices'
          : 'Weak dollar typically supports crypto prices'
      }
    };

    res.json({
      success: true,
      data: {
        current: {
          price: currentPrice,
          change24h: change24h,
          rsi: rsi[rsi.length - 1],
          ma20: ma20[ma20.length - 1],
          ma50: ma50[ma50.length - 1]
        },
        historical: enrichedData,
        analysis: analysis,
        metadata: {
          timeframe,
          lastUpdate: new Date().toISOString(),
          dataPoints: enrichedData.length
        }
      }
    });
  }),

  getCurrentIndex: asyncHandler(async (req, res) => {
    const dxyData = await traditionalService.getDXYData('1D');
    const current = dxyData[dxyData.length - 1];
    
    res.json({
      success: true,
      data: {
        price: current.price,
        timestamp: current.timestamp,
        open: current.open,
        high: current.high,
        low: current.low
      }
    });
  })
};

module.exports = { dxyController };
