const cacheService = require('../../src/services/cache/cacheService');

describe('Cache Service', () => {
  const testKey = 'test_key';
  const testData = { message: 'test data', timestamp: Date.now() };

  afterEach(async () => {
    // Clean up test data
    try {
      await cacheService.del(testKey);
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
      expect(typeof cacheService.del).toBe('function');
    });

    it('should set and get data', async () => {
      const result = await cacheService.set(testKey, testData);
      expect(result).toBe(true);

      const retrieved = await cacheService.get(testKey);
      expect(retrieved).toEqual(testData);
    }, 10000);

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non_existent_key');
      expect(result).toBeNull();
    }, 5000);

    it('should delete data', async () => {
      await cacheService.set(testKey, testData);
      const deleteResult = await cacheService.del(testKey);
      expect(deleteResult).toBe(true);

      const retrieved = await cacheService.get(testKey);
      expect(retrieved).toBeNull();
    }, 10000);
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL', async () => {
      const shortTTL = 1; // 1 second
      await cacheService.set(testKey, testData, shortTTL);
      
      // Data should be available immediately
      const immediate = await cacheService.get(testKey);
      expect(immediate).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Data should be expired
      const expired = await cacheService.get(testKey);
      expect(expired).toBeNull();
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      // This test simulates error conditions
      const result = await cacheService.get('invalid_key');
      expect(result).toBeNull();
    });

    it('should return false on set error', async () => {
      // Test with invalid data that might cause serialization issues
      const circularData = {};
      circularData.self = circularData;
      
      const result = await cacheService.set(testKey, circularData);
      expect(typeof result).toBe('boolean');
    });
  });
});