const Redis = require('ioredis');
const config = require('./environment');

const redisConfig = {
  url: config.REDIS_URL,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

let redisClient = null;

const createRedisConnection = () => {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log(' Redis connected successfully');
    });

    redisClient.on('close', () => {
      console.log('L Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('= Redis reconnecting...');
    });
  }
  
  return redisClient;
};

const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed gracefully');
  }
};

const testRedisConnection = async () => {
  try {
    const client = createRedisConnection();
    await client.ping();
    console.log('Redis connection test: SUCCESS');
    return true;
  } catch (error) {
    console.error('Redis connection test: FAILED', error.message);
    return false;
  }
};

module.exports = {
  redisConfig,
  createRedisConnection,
  closeRedisConnection,
  testRedisConnection,
  getRedisClient: () => redisClient
};