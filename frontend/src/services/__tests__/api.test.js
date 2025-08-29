import apiService from '../api';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}));

describe('API Service', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get the mocked axios instance
    const axios = require('axios');
    mockAxiosInstance = axios.default.create();
  });

  describe('Bitcoin API calls', () => {
    test('should fetch BTC price', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            currentPrice: 45000,
            priceChange24h: 1200,
            priceChangePercent24h: 2.75
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getBTCPrice();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/btc/current');
      expect(result).toEqual(mockResponse.data);
    });

    test('should fetch BTC analysis', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            current: { price: 45000 },
            analysis: { trend: 'bullish' },
            historical: []
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getBTCAnalysis('7D');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/btc/analysis', {
        params: { timeframe: '7D' }
      });
      expect(result).toEqual(mockResponse.data);
    });

    test('should fetch MA ribbon data', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            currentPrice: 45000,
            movingAverages: { ma20: 44000, ma50: 43000 },
            signals: { above_ma20: true, above_ma50: true }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getMARibbon('BTC', '30D');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/btc/ma-ribbon', {
        params: { timeframe: '30D', symbol: 'BTC' }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('DXY API calls', () => {
    test('should fetch DXY analysis', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            current: { price: 102.45, change24h: 0.15 },
            analysis: { trend: 'bullish' }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getDXYAnalysis('30D');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/dxy/analysis', {
        params: { timeframe: '30D' }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Funding Rates API calls', () => {
    test('should fetch funding rates', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            rates: [
              { 
                exchange: 'Binance', 
                symbol: 'BTC', 
                fundingRate: 0.0075,
                nextFundingTime: '2024-01-01T08:00:00Z'
              }
            ],
            statistics: { averageFundingRate: 0.0075 }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getFundingRates('BTC', 'Binance');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/funding/rates', {
        params: { symbol: 'BTC', exchange: 'Binance' }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Health Check API calls', () => {
    test('should perform health check', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          uptime: 3600,
          timestamp: new Date().toISOString()
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Error handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(apiService.getBTCPrice()).rejects.toThrow('Network Error');
    });

    test('should handle API errors with response', async () => {
      const apiError = {
        response: {
          data: { message: 'Invalid timeframe' },
          status: 400
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(apiError);

      await expect(apiService.getBTCAnalysis('invalid')).rejects.toEqual(apiError);
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      await expect(apiService.getDXYAnalysis()).rejects.toThrow('timeout');
    });
  });

  describe('getAllMarketDataWithAnalysis', () => {
    test('should fetch all market data successfully', async () => {
      const mockBTCResponse = {
        data: { success: true, data: { currentPrice: 45000, analysis: { trend: 'bullish' } } }
      };
      const mockDXYResponse = {
        data: { success: true, data: { current: { price: 102.45 } } }
      };
      const mockFundingResponse = {
        data: { success: true, data: { rates: [] } }
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockBTCResponse)
        .mockResolvedValueOnce(mockDXYResponse)
        .mockResolvedValueOnce(mockFundingResponse);

      const result = await apiService.getAllMarketDataWithAnalysis();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result.data.bitcoin).toBeDefined();
      expect(result.data.dxy).toBeDefined();
      expect(result.data.fundingRates).toBeDefined();
    });

    test('should handle partial failures gracefully', async () => {
      const mockBTCResponse = {
        data: { success: true, data: { currentPrice: 45000 } }
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockBTCResponse)
        .mockRejectedValueOnce(new Error('DXY failed'))
        .mockRejectedValueOnce(new Error('Funding failed'));

      const result = await apiService.getAllMarketDataWithAnalysis();

      expect(result.data.bitcoin).toBeDefined();
      expect(result.data.dxy).toBeNull();
      expect(result.data.fundingRates).toBeNull();
      expect(result.data.errors).toHaveLength(2);
    });
  });

  describe('Request configuration', () => {
    test('should have correct base URL', () => {
      expect(apiService.baseURL).toBe('/api');
    });

    test('should have correct timeout', () => {
      expect(apiService.timeout).toBe(10000);
    });

    test('should have correct headers', () => {
      expect(apiService.headers['Content-Type']).toBe('application/json');
    });
  });
});