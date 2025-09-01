// API Service for handling all backend requests
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-production-8f8a.up.railway.app';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.coinGeckoURL = COINGECKO_API_URL;
    
    // Token configurations
    this.tokens = {
      bitcoin: { id: 'bitcoin', symbol: 'BTC' },
      ethereum: { id: 'ethereum', symbol: 'ETH' },
      solana: { id: 'solana', symbol: 'SOL' }
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // CoinGecko API request helper
  async coinGeckoRequest(endpoint, params = {}) {
    const url = new URL(`${this.coinGeckoURL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('CoinGecko API request failed:', error);
      throw error;
    }
  }

  // BTC Price
  async getBTCPrice() {
    return this.request('/api/v1/btc/price');
  }

  // BTC Analysis
  async getBTCAnalysis(timeframe = '1D') {
    return this.request(`/api/v1/btc-analysis?timeframe=${timeframe}`);
  }

  // DXY Analysis
  async getDXYAnalysis(timeframe = '30D') {
    return this.request(`/api/v1/dxy-analysis?timeframe=${timeframe}`);
  }

  // ETF Flows
  async getETFFlows(dateRange = '30D', etf = null) {
    const params = new URLSearchParams({ dateRange });
    if (etf && etf !== 'all') {
      params.append('etf', etf);
    }
    return this.request(`/api/v1/etf-flows?${params}`);
  }

  // RSI Data
  async getRSI(symbol = 'BTC', timeframe = '1D', period = 14) {
    return this.request(`/api/v1/rsi?symbol=${symbol}&timeframe=${timeframe}&period=${period}`);
  }

  // Funding Rates
  async getFundingRates(symbol = 'BTC', exchange = null) {
    const params = new URLSearchParams({ symbol });
    if (exchange) {
      params.append('exchange', exchange);
    }
    return this.request(`/api/v1/funding-rates?${params}`);
  }

  // MA Ribbon data
  async getMARibbon(symbol = 'BTC', timeframe = '7D') {
    return this.request(`/api/v1/btc/ma-ribbon?symbol=${symbol}&timeframe=${timeframe}`);
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }

  // ========== CoinGecko Integration Methods ==========

  // DEPRECATED - Use backend API instead of direct CoinGecko calls
  async getAllTokenPrices() {
    console.warn('getAllTokenPrices is deprecated - use backend API instead');
    return {
      success: true,
      data: {
        bitcoin: this.generateCryptoMockData('bitcoin'),
        ethereum: this.generateCryptoMockData('ethereum'),
        solana: this.generateCryptoMockData('solana')
      }
    };
  }

  // DEPRECATED - Use backend API instead of direct CoinGecko calls
  // This method is kept for backward compatibility but should not be used
  async getBTCHistoricalData(days = 220) {
    console.warn('getBTCHistoricalData is deprecated - use backend API instead');
    // Return mock data to avoid rate limiting
    return {
      success: true,
      data: {
        prices: this.generateCryptoMockData('bitcoin').prices || [],
        volumes: [],
        marketCaps: []
      }
    };
  }

  // DEPRECATED - Use backend API instead of direct CoinGecko calls
  async getETHHistoricalData(days = 220) {
    console.warn('getETHHistoricalData is deprecated - use backend API instead');
    return {
      success: true,
      data: {
        prices: this.generateCryptoMockData('ethereum').prices || [],
        volumes: []
      }
    };
  }

  // DEPRECATED - Use backend API instead of direct CoinGecko calls
  async getSOLHistoricalData(days = 220) {
    console.warn('getSOLHistoricalData is deprecated - use backend API instead');
    return {
      success: true,
      data: {
        prices: this.generateCryptoMockData('solana').prices || [],
        volumes: []
      }
    };
  }

  // Generate comprehensive mock crypto data
  generateCryptoMockData(symbol) {
    const priceMap = {
      bitcoin: { price: 116000, change: -1.2, volume: 45000000000, marketCap: 2300000000000 },
      ethereum: { price: 3500, change: 2.1, volume: 15000000000, marketCap: 420000000000 },
      solana: { price: 240, change: 0.8, volume: 2000000000, marketCap: 112000000000 }
    };
    
    const config = priceMap[symbol] || priceMap.bitcoin;
    const now = new Date();
    const prices = [];
    
    // Generate 220 days of price history for proper MA calculations
    for (let i = 220; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movement
      const variation = (Math.random() - 0.5) * 0.02; // ±2% daily variation
      const trendFactor = Math.sin(i / 30) * 0.01; // Subtle trend pattern
      const price = config.price * (1 + variation + trendFactor);
      
      prices.push({
        timestamp: date,
        price: Math.round(price * 100) / 100
      });
    }
    
    return {
      currentPrice: config.price,
      priceChange24h: config.change,
      priceChangePercent24h: config.change,
      marketCap: config.marketCap,
      volume24h: config.volume,
      prices: prices,
      rsi: {}, // Will be calculated by backend
      movingAverages: {}, // Will be calculated by backend
      source: 'Mock Data (Avoiding Rate Limits)'
    };
  }

  // Transform RSI data helper
  transformRSI(rsiData) {
    if (!rsiData) return {};
    const transformed = {};
    Object.keys(rsiData).forEach(period => {
      if (Array.isArray(rsiData[period])) {
        transformed[period] = rsiData[period].map(item => ({
          timestamp: new Date(item.timestamp),
          value: item.value
        }));
      }
    });
    return transformed;
  }

  // Transform moving averages helper
  transformMovingAverages(maData) {
    if (!maData) return {};
    const transformed = {};
    Object.keys(maData).forEach(period => {
      if (Array.isArray(maData[period])) {
        transformed[period] = maData[period].map(item => ({
          timestamp: new Date(item.timestamp),
          value: item.value
        }));
      }
    });
    return transformed;
  }

  // Complete mock data fallback method
  async getAllMarketDataMock() {
    return {
      success: true,
      data: {
        bitcoin: this.generateCryptoMockData('bitcoin'),
        ethereum: this.generateCryptoMockData('ethereum'),
        solana: this.generateCryptoMockData('solana'),
        dxy: {
          currentPrice: 104.25,
          change24h: -0.12,
          analysis: {
            strength: 'neutral',
            trend: 'sideways',
            dollarImpact: {
              crypto: 'neutral',
              description: 'Dollar strength is neutral for crypto prices'
            }
          },
          prices: this.generateDXYMockData(),
          dataSource: 'Mock Data (Full Fallback)'
        },
        etfFlows: {
          btcFlows: this.generateETFMockData('btc'),
          ethFlows: this.generateETFMockData('eth'),
          dataSource: 'Mock Data (Full Fallback)'
        },
        fundingRates: {
          btc: {
            rate: 0.0008,
            trend: 'bullish',
            exchange: 'Mock',
            price: 116000,
            symbol: 'BTCUSDT'
          },
          eth: {
            rate: 0.0015,
            trend: 'bullish',
            exchange: 'Mock',
            symbol: 'ETHUSDT'
          },
          dataSource: 'Mock Data (Full Fallback)'
        }
      }
    };
  }

  // Helper function to generate DXY mock data for immediate display
  generateDXYMockData() {
    const data = [];
    const now = new Date();
    const daysBack = 30;
    let basePrice = 104.25;
    
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Add some realistic volatility
      const change = (Math.random() - 0.5) * 0.8;
      basePrice += change;
      basePrice = Math.max(102, Math.min(106, basePrice)); // Keep within realistic range
      
      data.push({
        timestamp: date,
        price: parseFloat(basePrice.toFixed(2))
      });
    }
    return data;
  }

  // Helper function to generate ETF flow mock data
  generateETFMockData(type) {
    const data = [];
    const now = new Date();
    const daysBack = 30;
    
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic flow data (can be positive or negative)
      const baseFlow = type === 'btc' ? 150 : 50; // BTC flows larger than ETH
      const variation = (Math.random() - 0.5) * baseFlow * 2;
      const flow = (baseFlow + variation) * 1000000; // Convert to actual dollars
      
      data.push({
        timestamp: date,
        flow: Math.round(flow)
      });
    }
    return data;
  }

  // Helper method to get real DXY data
  async getRealDXYData() {
    try {
      const response = await this.getDXYAnalysis('7D'); // Use shorter timeframe to reduce load
      if (response && response.success && response.data) {
        return {
          currentPrice: response.data.current.price,
          change24h: response.data.current.change24h,
          analysis: response.data.analysis,
          prices: response.data.historical.map(item => ({
            timestamp: new Date(item.timestamp),
            price: item.price
          })),
          dataSource: 'Alpha Vantage API'
        };
      }
      // Fallback to mock data if API fails
      console.warn('DXY API returned no data, using enhanced mock data');
      return {
        currentPrice: 104.25,
        change24h: -0.12,
        analysis: {
          strength: 'neutral',
          trend: 'sideways',
          dollarImpact: {
            crypto: 'neutral',
            description: 'Dollar strength is neutral for crypto prices'
          }
        },
        prices: this.generateDXYMockData(),
        dataSource: 'Mock Data (API unavailable)'
      };
    } catch (error) {
      console.warn('Failed to fetch real DXY data, using enhanced mock:', error.message);
      return {
        currentPrice: 104.25,
        change24h: -0.12,
        analysis: {
          strength: 'neutral', 
          trend: 'sideways',
          dollarImpact: {
            crypto: 'neutral',
            description: 'Dollar strength is neutral for crypto prices'
          }
        },
        prices: this.generateDXYMockData(),
        dataSource: 'Mock Data (API Error)'
      };
    }
  }

  // Helper method to get real ETF data
  async getRealETFData() {
    try {
      const response = await this.getETFFlows('7D'); // Use shorter timeframe for reliability
      if (response && response.success && response.data && response.data.flows) {
        const btcFlows = response.data.flows
          .filter(flow => flow.etf && (flow.etf.includes('BTC') || flow.etf === 'IBIT' || flow.etf === 'FBTC' || flow.etf === 'ARKB'))
          .map(flow => ({
            timestamp: new Date(flow.date),
            flow: flow.flow || 0,
            etf: flow.etf
          }));
        
        const ethFlows = response.data.flows
          .filter(flow => flow.etf && flow.etf.includes('ETH'))
          .map(flow => ({
            timestamp: new Date(flow.date), 
            flow: flow.flow || 0,
            etf: flow.etf
          }));

        return {
          btcFlows: btcFlows.length > 0 ? btcFlows : this.generateETFMockData('btc'),
          ethFlows: ethFlows.length > 0 ? ethFlows : this.generateETFMockData('eth'),
          summary: response.data.summary || null,
          dataSource: btcFlows.length > 0 ? 'Enhanced Mock with Real Structure' : 'Mock Data'
        };
      }
      // Fallback to mock data if API fails
      console.warn('ETF API returned no valid data, using enhanced mock data');
      return {
        btcFlows: this.generateETFMockData('btc'),
        ethFlows: this.generateETFMockData('eth'),
        dataSource: 'Mock Data (API unavailable)'
      };
    } catch (error) {
      console.warn('Failed to fetch real ETF data, using enhanced mock:', error.message);
      return {
        btcFlows: this.generateETFMockData('btc'),
        ethFlows: this.generateETFMockData('eth'),
        dataSource: 'Mock Data (API Error)'
      };
    }
  }

  // Helper method to get real funding rates
  async getRealFundingRates() {
    try {
      const response = await this.getFundingRates('BTC');
      if (response && response.success && response.data && response.data.rates && response.data.rates.length > 0) {
        const btcRate = response.data.rates[0];
        return {
          btc: {
            rate: btcRate.fundingRate || 0,
            trend: (btcRate.fundingRate || 0) > 0 ? 'bullish' : 'bearish',
            exchange: btcRate.exchange || 'Binance',
            price: btcRate.price || 0,
            nextFundingTime: btcRate.nextFundingTime,
            symbol: btcRate.symbol || 'BTCUSDT'
          },
          eth: {
            rate: 0.0015, // Default for now, can be enhanced later
            trend: 'bullish',
            exchange: 'Binance',
            symbol: 'ETHUSDT'
          },
          statistics: response.data.statistics || null,
          dataSource: 'Binance API'
        };
      }
      // Fallback to mock data if API fails
      console.warn('Funding rates API returned no valid data, using mock data');
      return {
        btc: {
          rate: 0.0008,
          trend: 'bullish',
          exchange: 'Mock',
          price: 116000,
          symbol: 'BTCUSDT'
        },
        eth: {
          rate: 0.0015,
          trend: 'bullish',
          exchange: 'Mock',
          symbol: 'ETHUSDT'
        },
        dataSource: 'Mock Data (API unavailable)'
      };
    } catch (error) {
      console.warn('Failed to fetch real funding rates, using mock:', error.message);
      return {
        btc: {
          rate: 0.0008,
          trend: 'bullish',
          exchange: 'Mock',
          price: 116000,
          symbol: 'BTCUSDT'
        },
        eth: {
          rate: 0.0015,
          trend: 'bullish', 
          exchange: 'Mock',
          symbol: 'ETHUSDT'
        },
        dataSource: 'Mock Data (API Error)'
      };
    }
  }

  // Enhanced method to get all market data with backend analysis
  async getAllMarketDataWithAnalysis() {
    try {
      // Single request to backend for all crypto data with 220+ days for proper MA calculations
      const response = await this.request('/api/v1/crypto/multi-analysis?symbols=BTC,ETH,SOL&timeframe=1Y&includeAnalysis=true');
      
      if (!response.success) {
        console.warn('Backend analysis request failed, using fallback');
        throw new Error('Backend analysis request failed');
      }

      // Transform timestamps from string to Date objects for prices
      const transformPrices = (priceArray) => {
        if (!Array.isArray(priceArray)) return [];
        return priceArray.map(item => ({
          timestamp: new Date(item.timestamp),
          price: item.price
        }));
      };

      // Transform RSI data to match frontend expectations  
      const transformRSI = (rsiData) => {
        if (!rsiData) return {};
        const transformed = {};
        Object.keys(rsiData).forEach(period => {
          if (Array.isArray(rsiData[period])) {
            transformed[period] = rsiData[period].map(item => ({
              timestamp: new Date(item.timestamp),
              value: item.value
            }));
          }
        });
        return transformed;
      };

      // Transform moving averages to match frontend expectations
      const transformMovingAverages = (maData) => {
        if (!maData) return {};
        const transformed = {};
        Object.keys(maData).forEach(period => {
          if (Array.isArray(maData[period])) {
            transformed[period] = maData[period].map(item => ({
              timestamp: new Date(item.timestamp),
              value: item.value
            }));
          }
        });
        return transformed;
      };

      // Transform the backend data to match frontend expectations
      const transformedData = {
        bitcoin: {
          currentPrice: response.data.btc.current.price,
          priceChange24h: response.data.btc.current.change24h,
          priceChangePercent24h: response.data.btc.current.change24h,
          marketCap: response.data.btc.current.marketCap,
          volume24h: response.data.btc.current.volume24h,
          prices: transformPrices(response.data.btc.historical),
          rsi: transformRSI(response.data.btc.rsi),
          movingAverages: transformMovingAverages(response.data.btc.movingAverages),
          rsiStatus: response.data.btc.rsiStatus,
          source: 'Backend API with CoinGecko'
        },
        ethereum: {
          currentPrice: response.data.eth.current.price,
          priceChange24h: response.data.eth.current.change24h,
          priceChangePercent24h: response.data.eth.current.change24h,
          marketCap: response.data.eth.current.marketCap,
          volume24h: response.data.eth.current.volume24h,
          prices: transformPrices(response.data.eth.historical),
          rsi: transformRSI(response.data.eth.rsi),
          movingAverages: transformMovingAverages(response.data.eth.movingAverages),
          rsiStatus: response.data.eth.rsiStatus,
          source: 'Backend API with CoinGecko'
        },
        solana: {
          currentPrice: response.data.sol.current.price,
          priceChange24h: response.data.sol.current.change24h,
          priceChangePercent24h: response.data.sol.current.change24h,
          marketCap: response.data.sol.current.marketCap,
          volume24h: response.data.sol.current.volume24h,
          prices: transformPrices(response.data.sol.historical),
          rsi: transformRSI(response.data.sol.rsi),
          movingAverages: transformMovingAverages(response.data.sol.movingAverages),
          rsiStatus: response.data.sol.rsiStatus,
          source: 'Backend API with CoinGecko'
        },
        // Add real DXY and ETF data
        dxy: await this.getRealDXYData(),
        etfFlows: await this.getRealETFData(),
        fundingRates: await this.getRealFundingRates()
      };

      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      console.error('Failed to fetch market data with analysis:', error);
      // Enhanced fallback - try basic backend API first, then mock data
      try {
        return await this.getAllMarketDataBackendFallback();
      } catch (fallbackError) {
        console.warn('Backend fallback failed, using mock data:', fallbackError.message);
        return this.getAllMarketDataMock();
      }
    }
  }

  // Backend fallback method - try individual endpoints if batch fails
  async getAllMarketDataBackendFallback() {
    try {
      // Try individual crypto analysis calls
      const [btcData, ethData, solData] = await Promise.allSettled([
        this.request('/api/v1/crypto/analysis?symbol=BTC&timeframe=1Y&includeAnalysis=true'),
        this.request('/api/v1/crypto/analysis?symbol=ETH&timeframe=1Y&includeAnalysis=true'),
        this.request('/api/v1/crypto/analysis?symbol=SOL&timeframe=1Y&includeAnalysis=true')
      ]);

      // Transform successful responses
      const transformIndividualResponse = (result, symbol) => {
        if (result.status === 'fulfilled' && result.value.success) {
          const data = result.value.data;
          return {
            currentPrice: data.current?.price || 0,
            priceChange24h: data.current?.change24h || 0,
            priceChangePercent24h: data.current?.change24h || 0,
            marketCap: data.current?.marketCap || 0,
            volume24h: data.current?.volume24h || 0,
            prices: data.historical?.map(item => ({
              timestamp: new Date(item.timestamp),
              price: item.price
            })) || [],
            rsi: this.transformRSI(data.rsi),
            movingAverages: this.transformMovingAverages(data.movingAverages),
            rsiStatus: data.rsiStatus,
            source: 'Backend API Individual'
          };
        }
        return this.generateCryptoMockData(symbol);
      };

      return {
        success: true,
        data: {
          bitcoin: transformIndividualResponse(btcData, 'bitcoin'),
          ethereum: transformIndividualResponse(ethData, 'ethereum'),
          solana: transformIndividualResponse(solData, 'solana'),
          dxy: await this.getRealDXYData(),
          etfFlows: await this.getRealETFData(),
          fundingRates: await this.getRealFundingRates()
        }
      };
    } catch (error) {
      console.error('Backend fallback failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

// Export individual methods for easier importing
export const {
  getBTCPrice,
  getBTCAnalysis,
  getDXYAnalysis,
  getETFFlows,
  getRSI,
  getFundingRates,
  healthCheck,
} = apiService;