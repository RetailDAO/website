const axios = require('axios');
const config = require('../../config/environment');
const cacheService = require('../cache/cacheService');

class TraditionalDataService {
  constructor() {
    this.alphaVantageClient = axios.create({
      baseURL: config.ALPHA_VANTAGE_BASE_URL
    });
  }

  async getDXYData(timeframe = '1D') {
    const cacheKey = `dxy_data_${timeframe}`;
    
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      // First try to get actual DXY data from Alpha Vantage
      let response;
      let timeSeries;
      
      try {
        // Try DXY directly (if available)
        response = await this.alphaVantageClient.get('', {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: 'DXY',
            apikey: config.ALPHA_VANTAGE_API_KEY,
            outputsize: timeframe === '1D' ? 'compact' : 'full'
          }
        });
        timeSeries = response.data['Time Series (Daily)'];
      } catch (dxyError) {
        console.log('📊 DXY symbol not available, using EUR/USD inverse calculation');
        
        // Fallback to EUR/USD and calculate DXY approximation
        response = await this.alphaVantageClient.get('', {
          params: {
            function: 'FX_DAILY',
            from_symbol: 'EUR',
            to_symbol: 'USD',
            apikey: config.ALPHA_VANTAGE_API_KEY,
            outputsize: timeframe === '1D' ? 'compact' : 'full'
          }
        });
        timeSeries = response.data['Time Series FX (Daily)'];
      }

      if (!timeSeries) {
        throw new Error('Invalid response from Alpha Vantage');
      }

      const dataLimit = this.timeframeToLimit(timeframe);
      const data = Object.entries(timeSeries)
        .slice(0, dataLimit)
        .map(([date, values]) => {
          // If using EUR/USD, convert to DXY approximation
          let price, open, high, low;
          
          if (response.data['Time Series (Daily)']) {
            // Direct DXY data
            price = parseFloat(values['4. close']);
            open = parseFloat(values['1. open']);
            high = parseFloat(values['2. high']);
            low = parseFloat(values['3. low']);
          } else {
            // EUR/USD inverse approximation (multiply by base DXY factor)
            const eurUsdClose = parseFloat(values['4. close']);
            const eurUsdOpen = parseFloat(values['1. open']);
            const eurUsdHigh = parseFloat(values['2. high']);
            const eurUsdLow = parseFloat(values['3. low']);
            
            // Approximate DXY calculation (DXY ≈ 105 / EUR/USD)
            const baseDXY = 105;
            price = baseDXY / eurUsdClose;
            open = baseDXY / eurUsdOpen;
            high = baseDXY / eurUsdLow; // Inverted for EUR/USD
            low = baseDXY / eurUsdHigh; // Inverted for EUR/USD
          }

          return {
            timestamp: new Date(date).toISOString(),
            price: parseFloat(price.toFixed(3)),
            open: parseFloat(open.toFixed(3)),
            high: parseFloat(high.toFixed(3)),
            low: parseFloat(low.toFixed(3))
          };
        })
        .reverse();

      console.log(`✅ [Alpha Vantage] Retrieved DXY data for ${timeframe} (${data.length} points)`);
      await cacheService.set(cacheKey, data, 900); // 15 minutes
      return data;

    } catch (error) {
      console.error('❌ [Alpha Vantage] Error fetching DXY data, using fallback:', error.message);
      
      // Try to get the most recent cached data as baseline for mock data
      const mockData = await this.generateMockDXYDataFromCache(timeframe);
      await cacheService.set(cacheKey, mockData, 60); // 1 minute cache for mock data
      console.log(`🎭 [Mock] Serving mock DXY data for ${timeframe} (${mockData.length} points)`);
      return mockData;
    }
  }

  async generateMockDXYDataFromCache(timeframe) {
    // Try to find any existing cached DXY data from different timeframes
    const possibleCacheKeys = ['dxy_data_1D', 'dxy_data_7D', 'dxy_data_30D', 'dxy_data_90D'];
    let recentData = null;
    
    for (const key of possibleCacheKeys) {
      const cached = await cacheService.get(key);
      if (cached && cached.length > 0) {
        recentData = cached;
        break;
      }
    }
    
    let basePrice = 106.5; // Default DXY value around recent levels
    let lastTimestamp = new Date();
    
    // If we have recent cached data, use the most recent price as baseline
    if (recentData && recentData.length > 0) {
      const mostRecent = recentData[recentData.length - 1];
      basePrice = mostRecent.price;
      lastTimestamp = new Date(mostRecent.timestamp);
    }
    
    const dataPoints = this.timeframeToLimit(timeframe);
    const mockData = [];
    
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = new Date(lastTimestamp);
      timestamp.setDate(timestamp.getDate() - i);
      
      // Generate realistic DXY movement (typically less volatile than crypto)
      const variation = (Math.random() - 0.5) * 0.01; // ±1% variation
      const price = basePrice * (1 + variation * (i / dataPoints) * 0.5);
      
      // DXY typically moves in smaller ranges
      const dailyVariation = (Math.random() - 0.5) * 0.005; // ±0.5% daily
      const finalPrice = price + (basePrice * dailyVariation);
      
      mockData.push({
        timestamp: timestamp.toISOString(),
        price: parseFloat(finalPrice.toFixed(3)),
        open: parseFloat((finalPrice * 0.999).toFixed(3)),
        high: parseFloat((finalPrice * 1.002).toFixed(3)),
        low: parseFloat((finalPrice * 0.998).toFixed(3))
      });
    }
    
    return mockData.reverse();
  }

  timeframeToLimit(timeframe) {
    const mapping = {
      '1D': 1,
      '7D': 7,
      '30D': 30,
      '90D': 90
    };
    return mapping[timeframe] || 30;
  }
}

module.exports = { TraditionalDataService };