const { CryptoDataService } = require('../services/dataProviders/cryptoDataservice');
const { calculateRSI, calculateMovingAverage } = require('../utils/technical_indicators');
const cacheService = require('../services/cache/cacheService');

const cryptoDataService = new CryptoDataService();

class CryptoController {
  async getCryptoAnalysis(req, res) {
    try {
      const { symbol = 'BTC', timeframe = '30D', includeAnalysis = 'true' } = req.query;
      const cacheKey = `crypto_analysis_${symbol}_${timeframe}_${includeAnalysis}`;

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData, source: 'cache' });
      }

      // Get crypto data from service
      const cryptoData = await cryptoDataService.getCryptoData(symbol, timeframe);
      let analysisData = { ...cryptoData };

      if (includeAnalysis === 'true' && cryptoData.historical && cryptoData.historical.length > 0) {
        // Extract prices for technical analysis
        const prices = cryptoData.historical.map(item => item.price);
        
        // Calculate RSI for multiple periods
        const rsiData = {};
        [14, 21, 30].forEach(period => {
          const rsiValues = calculateRSI(prices, period);
          if (rsiValues.length > 0) {
            rsiData[period] = rsiValues.map((value, index) => ({
              timestamp: cryptoData.historical[cryptoData.historical.length - rsiValues.length + index].timestamp,
              value: Math.round(value * 100) / 100
            }));
          }
        });

        // Calculate Moving Averages
        const movingAverages = {};
        [20, 50, 100, 200].forEach(period => {
          const maValues = calculateMovingAverage(prices, period);
          if (maValues.length > 0) {
            movingAverages[period] = maValues.map((value, index) => ({
              timestamp: cryptoData.historical[cryptoData.historical.length - maValues.length + index].timestamp,
              value: Math.round(value * 100) / 100
            }));
          }
        });

        // Add analysis to data
        analysisData.rsi = rsiData;
        analysisData.movingAverages = movingAverages;
        
        // Add current RSI status
        if (rsiData[14] && rsiData[14].length > 0) {
          const currentRSI = rsiData[14][rsiData[14].length - 1].value;
          analysisData.rsiStatus = {
            current: currentRSI,
            status: currentRSI > 70 ? 'Overbought' : currentRSI < 30 ? 'Oversold' : 'Normal',
            signal: currentRSI > 70 ? 'SELL' : currentRSI < 30 ? 'BUY' : 'HOLD'
          };
        }
      }

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, analysisData, 300);

      res.json({
        success: true,
        data: analysisData,
        source: 'api',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error getting ${req.query.symbol || 'BTC'} analysis:`, error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch ${req.query.symbol || 'BTC'} analysis`,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMultipleCryptoAnalysis(req, res) {
    try {
      const { symbols = 'BTC,ETH,SOL', timeframe = '30D', includeAnalysis = 'true' } = req.query;
      const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
      const cacheKey = `multi_crypto_analysis_${symbols}_${timeframe}_${includeAnalysis}`;

      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData, source: 'cache' });
      }

      const results = {};
      
      // Process each symbol
      for (const symbol of symbolArray) {
        try {
          const cryptoData = await cryptoDataService.getCryptoData(symbol, timeframe);

          let analysisData = { ...cryptoData };

          if (includeAnalysis === 'true' && cryptoData.historical && cryptoData.historical.length > 0) {
            const prices = cryptoData.historical.map(item => item.price);
            
            // Calculate RSI for multiple periods
            const rsiData = {};
            [14, 21, 30].forEach(period => {
              const rsiValues = calculateRSI(prices, period);
              if (rsiValues.length > 0) {
                rsiData[period] = rsiValues.map((value, index) => ({
                  timestamp: cryptoData.historical[cryptoData.historical.length - rsiValues.length + index].timestamp,
                  value: Math.round(value * 100) / 100
                }));
              }
            });

            // Calculate Moving Averages
            const movingAverages = {};
            [20, 50, 100, 200].forEach(period => {
              const maValues = calculateMovingAverage(prices, period);
              if (maValues.length > 0) {
                movingAverages[period] = maValues.map((value, index) => ({
                  timestamp: cryptoData.historical[cryptoData.historical.length - maValues.length + index].timestamp,
                  value: Math.round(value * 100) / 100
                }));
              }
            });

            analysisData.rsi = rsiData;
            analysisData.movingAverages = movingAverages;
            
            // Add current RSI status
            if (rsiData[14] && rsiData[14].length > 0) {
              const currentRSI = rsiData[14][rsiData[14].length - 1].value;
              analysisData.rsiStatus = {
                current: currentRSI,
                status: currentRSI > 70 ? 'Overbought' : currentRSI < 30 ? 'Oversold' : 'Normal',
                signal: currentRSI > 70 ? 'SELL' : currentRSI < 30 ? 'BUY' : 'HOLD'
              };
            }
          }

          results[symbol.toLowerCase()] = analysisData;

        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);
          results[symbol.toLowerCase()] = {
            error: `Failed to fetch ${symbol} data`,
            message: error.message
          };
        }
      }

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, results, 300);

      res.json({
        success: true,
        data: results,
        source: 'api',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting multiple crypto analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch crypto analysis',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }


  // Current price endpoint for individual crypto
  async getCurrentPrice(req, res) {
    try {
      const { symbol = 'BTC' } = req.query;
      const cacheKey = `current_price_${symbol}`;

      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData, source: 'cache' });
      }

      const cryptoData = await cryptoDataService.getCryptoData(symbol, '1D');
      const priceData = cryptoData.current;

      await cacheService.set(cacheKey, priceData, 60); // 1 minute cache

      res.json({
        success: true,
        data: priceData,
        source: 'api',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error getting ${req.query.symbol || 'BTC'} current price:`, error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch ${req.query.symbol || 'BTC'} current price`,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  /* 
   * RETAIL DAO Token Support (Commented for future implementation)
   * 
   * To re-enable RETAIL DAO support:
   * 1. Uncomment the methods below
   * 2. Update the symbolMap in cryptoDataservice.js to include RETAIL mappings
   * 3. Update frontend to add RETAIL card back to PriceCards component
   * 4. Update WebSocket service if real-time RETAIL prices are needed
   */

  /*
  static generateRetailTokenData(timeframe) {
    const basePrice = 0.024 + (Math.random() - 0.5) * 0.005; // $0.024 ± $0.0025
    const days = cryptoDataService.timeframeToDays(timeframe);
    const dataPoints = Math.min(days, 90);
    
    const historical = [];
    const now = new Date();
    
    // Generate realistic RETAIL token price movement
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - i);
      
      // More volatile movement for small cap token
      const variation = (Math.random() - 0.5) * 0.08; // ±8% variation
      const trendFactor = Math.sin(i / 10) * 0.02; // Slight trend pattern
      const price = basePrice * (1 + variation + trendFactor);
      
      historical.push({
        timestamp: timestamp.toISOString(),
        price: Math.round(price * 1000000) / 1000000 // 6 decimal places
      });
    }
    
    const currentPrice = historical[historical.length - 1].price;
    const previousPrice = historical[historical.length - 2]?.price || basePrice;
    
    return {
      current: {
        price: currentPrice,
        change24h: ((currentPrice - previousPrice) / previousPrice) * 100,
        volume24h: 125000 + Math.random() * 50000, // $125K - $175K daily volume
        marketCap: currentPrice * 1000000000, // 1B total supply (assumed)
        contract: '0xc7167e360bd63696a7870c0ef66939e882249f20',
        platform: 'Base Network (L2)'
      },
      historical
    };
  }
  */
}

const cryptoController = new CryptoController();

module.exports = { cryptoController };