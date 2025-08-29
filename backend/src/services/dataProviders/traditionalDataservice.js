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
      const response = await this.alphaVantageClient.get('', {
        params: {
          function: 'FX_DAILY',
          from_symbol: 'USD',
          to_symbol: 'EUR', // Using EUR as proxy for DXY calculation
          apikey: config.ALPHA_VANTAGE_API_KEY,
          outputsize: timeframe === '1D' ? 'compact' : 'full'
        }
      });

      const timeSeries = response.data['Time Series FX (Daily)'];
      if (!timeSeries) {
        throw new Error('Invalid response from Alpha Vantage');
      }

      const data = Object.entries(timeSeries)
        .slice(0, this.timeframeToLimit(timeframe))
        .map(([date, values]) => ({
          timestamp: new Date(date).toISOString(),
          price: parseFloat(values['4. close']),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low'])
        }))
        .reverse();

      await cacheService.set(cacheKey, data, 900); // 15 minutes
      return data;

    } catch (error) {
      console.error('Error fetching DXY data:', error);
      throw new Error('Failed to fetch DXY data');
    }
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