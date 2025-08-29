// API Service for handling all backend requests
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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

  // Get current prices for multiple coins (BTC, ETH, SOL)
  async getAllTokenPrices() {
    try {
      // Get BTC, ETH, and SOL prices
      const cryptoPrices = await this.coinGeckoRequest('/simple/price', {
        ids: 'bitcoin,ethereum,solana',
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_market_cap: 'true',
        include_24hr_vol: 'true'
      });

      return {
        success: true,
        data: {
          bitcoin: {
            currentPrice: cryptoPrices.bitcoin?.usd || 0,
            priceChange24h: cryptoPrices.bitcoin?.usd_24h_change || 0,
            priceChangePercent24h: cryptoPrices.bitcoin?.usd_24h_change || 0,
            marketCap: cryptoPrices.bitcoin?.usd_market_cap || 0,
            volume24h: cryptoPrices.bitcoin?.usd_24h_vol || 0
          },
          ethereum: {
            currentPrice: cryptoPrices.ethereum?.usd || 0,
            priceChange24h: cryptoPrices.ethereum?.usd_24h_change || 0,
            priceChangePercent24h: cryptoPrices.ethereum?.usd_24h_change || 0,
            marketCap: cryptoPrices.ethereum?.usd_market_cap || 0,
            volume24h: cryptoPrices.ethereum?.usd_24h_vol || 0
          },
          solana: {
            currentPrice: cryptoPrices.solana?.usd || 0,
            priceChange24h: cryptoPrices.solana?.usd_24h_change || 0,
            priceChangePercent24h: cryptoPrices.solana?.usd_24h_change || 0,
            marketCap: cryptoPrices.solana?.usd_market_cap || 0,
            volume24h: cryptoPrices.solana?.usd_24h_vol || 0
          }
        }
      };
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      throw error;
    }
  }

  // Get BTC historical data with 220 days
  async getBTCHistoricalData(days = 220) {
    try {
      const data = await this.coinGeckoRequest('/coins/bitcoin/market_chart', {
        vs_currency: 'usd',
        days: days,
        interval: 'daily'
      });

      return {
        success: true,
        data: {
          prices: data.prices.map(([timestamp, price]) => ({
            timestamp: new Date(timestamp),
            price: price
          })),
          volumes: data.total_volumes.map(([timestamp, volume]) => ({
            timestamp: new Date(timestamp),
            volume: volume
          })),
          marketCaps: data.market_caps.map(([timestamp, marketCap]) => ({
            timestamp: new Date(timestamp),
            marketCap: marketCap
          }))
        }
      };
    } catch (error) {
      console.error('Failed to fetch BTC historical data:', error);
      throw error;
    }
  }

  // Get ETH historical data  
  async getETHHistoricalData(days = 220) {
    try {
      const data = await this.coinGeckoRequest('/coins/ethereum/market_chart', {
        vs_currency: 'usd',
        days: days,
        interval: 'daily'
      });

      return {
        success: true,
        data: {
          prices: data.prices.map(([timestamp, price]) => ({
            timestamp: new Date(timestamp),
            price: price
          })),
          volumes: data.total_volumes.map(([timestamp, volume]) => ({
            timestamp: new Date(timestamp),
            volume: volume
          }))
        }
      };
    } catch (error) {
      console.error('Failed to fetch ETH historical data:', error);
      throw error;
    }
  }

  // Get SOL historical data  
  async getSOLHistoricalData(days = 220) {
    try {
      const data = await this.coinGeckoRequest('/coins/solana/market_chart', {
        vs_currency: 'usd',
        days: days,
        interval: 'daily'
      });

      return {
        success: true,
        data: {
          prices: data.prices.map(([timestamp, price]) => ({
            timestamp: new Date(timestamp),
            price: price
          })),
          volumes: data.total_volumes.map(([timestamp, volume]) => ({
            timestamp: new Date(timestamp),
            volume: volume
          }))
        }
      };
    } catch (error) {
      console.error('Failed to fetch SOL historical data:', error);
      throw error;
    }
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

  // Enhanced method to get all market data with backend analysis
  async getAllMarketDataWithAnalysis() {
    try {
      const response = await this.request('/api/v1/crypto/multi-analysis?symbols=BTC,ETH,SOL&timeframe=1Y&includeAnalysis=true');
      
      if (!response.success) {
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
        // Add DXY mock data and ETF flows for immediate display
        dxy: {
          currentPrice: 104.25,
          prices: this.generateDXYMockData()
        },
        etfFlows: {
          btcFlows: this.generateETFMockData('btc'),
          ethFlows: this.generateETFMockData('eth')
        },
        fundingRates: {
          btc: {
            rate: 0.0008,
            trend: 'bullish'
          },
          eth: {
            rate: 0.0015,
            trend: 'bullish'
          }
        }
      };

      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      console.error('Failed to fetch market data with analysis:', error);
      // Fallback to direct CoinGecko
      return this.getAllMarketDataCoinGecko();
    }
  }

  // Enhanced method to get all market data with CoinGecko integration
  async getAllMarketDataCoinGecko() {
    try {
      const [tokenPrices, btcHistorical] = await Promise.all([
        this.getAllTokenPrices(),
        this.getBTCHistoricalData(220)
      ]);

      return {
        success: true,
        data: {
          ...tokenPrices.data,
          bitcoin: {
            ...tokenPrices.data.bitcoin,
            prices: btcHistorical.data.prices,
            volumes: btcHistorical.data.volumes,
            movingAverages: {}, // Empty since CoinGecko doesn't provide MA
            rsi: {}, // Empty since CoinGecko doesn't provide RSI
            source: 'CoinGecko'
          },
          ethereum: {
            ...tokenPrices.data.ethereum,
            prices: [], // Empty for now
            rsi: {}, // Empty since CoinGecko doesn't provide RSI
            source: 'CoinGecko'
          },
          solana: {
            ...tokenPrices.data.solana,
            prices: [], // Empty for now
            rsi: {}, // Empty since CoinGecko doesn't provide RSI
            source: 'CoinGecko'
          },
          // Add mock data structures that frontend expects
          dxy: {
            currentPrice: 104.25,
            prices: this.generateDXYMockData()
          },
          etfFlows: {
            btcFlows: this.generateETFMockData('btc'),
            ethFlows: this.generateETFMockData('eth')
          },
          fundingRates: {
            btc: {
              rate: 0.0008, // Default values
              trend: 'bullish'
            },
            eth: {
              rate: 0.0015,
              trend: 'bullish'
            }
          }
        }
      };
    } catch (error) {
      console.error('Failed to fetch all market data:', error);
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