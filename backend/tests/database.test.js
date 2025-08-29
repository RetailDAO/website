const { 
  createRedisConnection, 
  closeRedisConnection, 
  testRedisConnection 
} = require('../src/config/database');

describe('Database Configuration', () => {
  let redisClient;

  afterEach(async () => {
    if (redisClient) {
      await closeRedisConnection();
      redisClient = null;
    }
  });

  describe('Redis Connection', () => {
    it('should create Redis connection', () => {
      redisClient = createRedisConnection();
      expect(redisClient).toBeDefined();
      expect(typeof redisClient.ping).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const client1 = createRedisConnection();
      const client2 = createRedisConnection();
      expect(client1).toBe(client2);
    });

    it('should test Redis connection', async () => {
      // This will attempt to connect to Redis
      // If Redis is not running, it should return false
      const isConnected = await testRedisConnection();
      expect(typeof isConnected).toBe('boolean');
    }, 10000); // 10 second timeout for connection test

    it('should close Redis connection gracefully', async () => {
      redisClient = createRedisConnection();
      await expect(closeRedisConnection()).resolves.not.toThrow();
    });
  });

  describe('Redis Configuration', () => {
    it('should have correct default configuration', () => {
      const { redisConfig } = require('../src/config/database');
      
      expect(redisConfig).toBeDefined();
      expect(redisConfig.retryDelayOnFailover).toBe(100);
      expect(redisConfig.maxRetriesPerRequest).toBe(3);
      expect(redisConfig.lazyConnect).toBe(true);
    });
  });
});