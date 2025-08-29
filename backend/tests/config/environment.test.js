const config = require('../../src/config/environment');

describe('Environment Configuration', () => {
  describe('Default Values', () => {
    it('should have required configuration keys', () => {
      expect(config.NODE_ENV).toBeDefined();
      expect(config.PORT).toBeDefined();
      expect(config.REDIS_URL).toBeDefined();
      expect(config.CACHE_TTL).toBeDefined();
    });

    it('should have default port 8000', () => {
      expect(config.PORT).toBe(8000);
    });

    it('should have default Redis URL', () => {
      expect(config.REDIS_URL).toBe('redis://localhost:6379');
    });

    it('should have default cache TTL', () => {
      expect(config.CACHE_TTL).toBe(300);
    });

    it('should have API base URLs', () => {
      expect(config.COINGECKO_BASE_URL).toBe('https://api.coingecko.com/api/v3');
      expect(config.ALPHA_VANTAGE_BASE_URL).toBe('https://www.alphavantage.co/query');
      expect(config.BINANCE_BASE_URL).toBe('https://api.binance.com/api/v3');
    });
  });

  describe('Environment Variables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should use environment variables when provided', () => {
      process.env.PORT = '9000';
      process.env.REDIS_URL = 'redis://test:6379';
      process.env.CACHE_TTL = '600';
      
      // Re-require the module to pick up new env vars
      delete require.cache[require.resolve('../../src/config/environment')];
      const testConfig = require('../../src/config/environment');

      expect(testConfig.PORT).toBe('9000');
      expect(testConfig.REDIS_URL).toBe('redis://test:6379');
      expect(testConfig.CACHE_TTL).toBe(600);
    });

    it('should handle invalid CACHE_TTL gracefully', () => {
      process.env.CACHE_TTL = 'invalid';
      
      delete require.cache[require.resolve('../../src/config/environment')];
      const testConfig = require('../../src/config/environment');

      expect(testConfig.CACHE_TTL).toBe(300); // Should default to 300
    });
  });

  describe('API Keys', () => {
    it('should handle optional API keys', () => {
      // API keys should be defined in config object, but may be undefined values
      expect('COINGECKO_API_KEY' in config).toBe(true);
      expect('ALPHA_VANTAGE_API_KEY' in config).toBe(true);
      expect('BINANCE_API_KEY' in config).toBe(true);
    });
  });
});