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
  },

  // Market Overview v2: Optimized Moving Averages endpoint
  async getMovingAverages(req, res, next) {
    try {
      const startTime = performance.now();
      
      // Use enhanced cache with 5-minute TTL for performance
      const cacheKey = `moving_averages_v2_${Math.floor(Date.now() / 300000)}`;
      
      // Try to get cached data first
      const cacheService = require('../services/cache/cacheService');
      let result = await cacheService.get(cacheKey);
      
      if (!result) {
        console.log('🔄 Computing fresh MA data for Market Overview v2');
        
        // Get optimized BTC data (220D for accurate 200D MA)
        const btcData = await cryptoService.getBTCData('220D');
        const currentPrice = btcData.current?.price || btcData.current_price;
        
        if (!btcData.historical || btcData.historical.length < 200) {
          throw new Error('Insufficient historical data for 200D MA calculation');
        }
        
        // Extract prices for MA calculations
        const prices = btcData.historical.map(item => item.price);
        
        // Calculate optimized moving averages
        const ma50Array = calculateMovingAverage(prices, 50);
        const ma200Array = calculateMovingAverage(prices, 200);
        
        // Get latest MA values
        const ma50Value = ma50Array[ma50Array.length - 1];
        const ma200Value = ma200Array[ma200Array.length - 1];
        
        // Calculate deviations and status
        const ma50Deviation = ((currentPrice - ma50Value) / ma50Value * 100);
        const ma200Deviation = ((currentPrice - ma200Value) / ma200Value * 100);
        
        // Determine MA status categories
        const ma50Status = determineMAStatus(ma50Deviation);
        const regime = currentPrice > ma200Value ? 'Bull' : 'Bear';
        
        // Calculate trend strength
        const trendStrength = Math.abs(ma50Deviation);
        
        result = {
          currentPrice,
          ma50: {
            value: Math.round(ma50Value * 100) / 100,
            deviation: Math.round(ma50Deviation * 100) / 100,
            status: ma50Status
          },
          ma200: {
            value: Math.round(ma200Value * 100) / 100,
            deviation: Math.round(ma200Deviation * 100) / 100,
            regime
          },
          analysis: {
            trendStrength: Math.round(trendStrength * 100) / 100,
            pricePosition: getPricePosition(currentPrice, ma50Value, ma200Value),
            signals: {
              goldenCross: ma50Value > ma200Value,
              deathCross: ma50Value < ma200Value,
              aboveBoth: currentPrice > ma50Value && currentPrice > ma200Value,
              belowBoth: currentPrice < ma50Value && currentPrice < ma200Value
            }
          },
          metadata: {
            calculatedAt: new Date().toISOString(),
            dataPoints: prices.length,
            source: btcData.dataSource || 'mixed',
            fresh: true
          }
        };
        
        // Cache for 5 minutes with performance metadata
        await cacheService.set(cacheKey, result, 300);
        console.log(`✅ MA calculation completed in ${Math.round(performance.now() - startTime)}ms`);
      } else {
        result.metadata.fresh = false;
        console.log(`⚡ Serving cached MA data (${Math.round(performance.now() - startTime)}ms)`);
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Moving Averages endpoint error:', error.message);
      next(error);
    }
  }
};

// Helper function to determine MA status based on deviation
function determineMAStatus(deviation) {
  if (deviation > 15) return 'Overheated';
  if (deviation > 8) return 'Stretched';
  if (deviation > -8 && deviation < 8) return 'Normal';
  if (deviation > -15) return 'Discounted';
  return 'Oversold';
}

// Helper function to determine price position relative to MAs
function getPricePosition(price, ma50, ma200) {
  if (price > ma50 && price > ma200) return 'Above both MAs';
  if (price < ma50 && price < ma200) return 'Below both MAs';
  if (price > ma50 && price < ma200) return 'Between MAs (above 50D)';
  if (price < ma50 && price > ma200) return 'Between MAs (below 50D)';
  return 'Neutral';
}

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