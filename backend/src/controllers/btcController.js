const { CryptoDataService } = require('../services/dataProviders/cryptoDataservice');
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
      
      // Use ultra-conservative 1-hour cache for moving averages
      const hourPeriod = Math.floor(Date.now() / (60 * 60 * 1000)); // 1-hour periods
      const cacheKey = `market:moving_averages:btc_${hourPeriod}`;
      
      // Get cache service and try cache with fallback support
      const cacheService = require('../services/cache/cacheService');
      const cacheResult = await cacheService.getWithFallback(cacheKey, 'moving_averages');
      let result = cacheResult.data;
      
      if (!result) {
        console.log('🔶 No cached MA data - using golden dataset (CACHE-FIRST)');
        
        // CACHE-FIRST: Never make API calls from client requests!
        // Try to get the most recent data from golden dataset (acceptable stale data)
        const goldenDataset = require('../services/cache/goldenDatasetService');
        const goldenMAs = await goldenDataset.retrieve('btc_binance_220D');
        
        if (goldenMAs && goldenMAs.data) {
          console.log('📊 Serving cached BTC MA data from golden dataset');
          
          // Use cached price data to calculate fresh MAs (no API call!)
          const btcData = goldenMAs.data;
          const currentPrice = btcData.current?.price || 113577; // Current from cache
          const prices = btcData.historical ? btcData.historical.map(item => item.price) : [];
          
          if (prices.length >= 200) {
            // Calculate MAs from cached price data
            const ma50Value = movingAverageService.calculateSMA(prices, 50);
            const ma200Value = movingAverageService.calculateSMA(prices, 200);
            
            const ma50Deviation = ((currentPrice - ma50Value) / ma50Value * 100);
            const ma200Deviation = ((currentPrice - ma200Value) / ma200Value * 100);
            const ma50Status = determineMAStatus(ma50Deviation);
            const regime = currentPrice > ma200Value ? 'Bull' : 'Bear';
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
                calculatedAt: new Date().toISOString(), // Use current timestamp when serving
                timestamp: new Date().toISOString(), // Add timestamp field for frontend compatibility
                dataPoints: prices.length,
                source: 'golden',
                fresh: true,
                cacheAge: goldenMAs.metadata.age // minutes old
              }
            };
            
            // Cache the computed result for future requests
            await cacheService.setMovingAverages(cacheKey, result);
            await cacheService.setFallbackData(cacheKey, result, 'moving_averages');
          }
        }
        
        // If still no result, return service unavailable 
        if (!result) {
          console.log('❌ No MA data available - background job needed');
          return res.status(503).json({
            success: false,
            error: 'Moving averages data temporarily unavailable',
            message: 'Data is being updated by background services. Please try again in a few minutes.',
            retryAfter: 300
          });
        }
        
        console.log(`✅ MA calculation completed in ${Math.round(performance.now() - startTime)}ms`);
        console.log(`🎯 Ultra-conservative cache: Next refresh in 1 hour`);
      } else {
        const freshness = cacheResult.fresh ? 'fresh' : 'stale';
        const source = cacheResult.source;
        result.metadata.fresh = cacheResult.fresh;
        // Update timestamp to current time when serving any cached data
        result.metadata.timestamp = new Date().toISOString();
        result.metadata.calculatedAt = new Date().toISOString();
        console.log(`⚡ Serving ${freshness} MA data from ${source} (${Math.round(performance.now() - startTime)}ms)`);
        if (!cacheResult.fresh) {
          console.log(`🔄 Stale MA data acceptable - will refresh in background`);
        }
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