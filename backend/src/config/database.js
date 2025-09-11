const Redis = require('ioredis');
const config = require('./environment');

const redisConfig = {
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: false, // Connect immediately to detect issues
  keepAlive: 30000,
  connectTimeout: 5000,
  commandTimeout: 5000,
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  retryDelayOnClusterDown: 300,
  enableReadyCheck: true, // Enable ready check for proper connection detection
  tls: config.REDIS_URL && config.REDIS_URL.includes('rediss://') ? {} : null
};

let redisClient = null;

const createRedisConnection = () => {
  if (!redisClient) {
    // Check if Redis URL is properly configured
    if (!config.REDIS_URL) {
      console.log('🔶 Redis URL not configured - using fallback mock cache');
      return null;
    }
    
    // In production, don't allow localhost Redis (security)
    if (config.NODE_ENV === 'production' && config.REDIS_URL === 'redis://localhost:6379') {
      console.log('🔶 Redis localhost not allowed in production - using fallback mock cache');
      return null;
    }

    try {
      console.log('🔄 Attempting to connect to Redis:', config.REDIS_URL.replace(/\/\/.*@/, '//***@'));
      redisClient = new Redis(redisConfig);
      
      redisClient.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
          console.log('🔶 Redis unavailable - application will use mock cache mode');
        }
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redisClient.on('close', () => {
        console.log('🔌 Redis connection closed');
      });

      redisClient.on('reconnecting', (ms) => {
        console.log(`🔄 Redis reconnecting in ${ms}ms...`);
      });

      redisClient.on('ready', () => {
        console.log('🚀 Redis client ready for operations');
      });

    } catch (error) {
      console.error('❌ Failed to create Redis client:', error.message);
      return null;
    }
  }
  
  return redisClient;
};

const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message);
    }
  }
};

const testRedisConnection = async () => {
  try {
    const client = createRedisConnection();
    if (!client) {
      console.log('🔶 Redis not configured - test skipped');
      return false;
    }
    
    await client.ping();
    console.log('✅ Redis connection test: SUCCESS');
    return true;
  } catch (error) {
    console.error('❌ Redis connection test: FAILED', error.message);
    return false;
  }
};

// Graceful shutdown handler
const gracefulRedisShutdown = async () => {
  console.log('🛑 Shutting down Redis connection...');
  await closeRedisConnection();
};

// Handle process termination
process.on('SIGTERM', gracefulRedisShutdown);
process.on('SIGINT', gracefulRedisShutdown);

module.exports = {
  redisConfig,
  createRedisConnection,
  closeRedisConnection,
  testRedisConnection,
  getRedisClient: () => redisClient
};