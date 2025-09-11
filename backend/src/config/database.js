const Redis = require('ioredis');
const config = require('./environment');

// Use REDIS_URL if provided, otherwise default to localhost
const getRedisConfig = () => {
  const baseConfig = {
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
  };

  // If REDIS_URL is provided, use it directly
  if (config.REDIS_URL && config.REDIS_URL !== 'redis://localhost:6379') {
    return {
      ...baseConfig,
      // ioredis will parse the URL automatically
      tls: config.REDIS_URL.includes('rediss://') ? {} : null
    };
  }

  // Otherwise use localhost default
  return {
    ...baseConfig,
    host: 'localhost',
    port: 6379,
    tls: null
  };
};

let redisClient = null;

const createRedisConnection = () => {
  if (!redisClient) {
    // Check if Redis URL is properly configured
    if (!config.REDIS_URL) {
      console.log('🔶 Redis URL not configured - using fallback mock cache');
      return null;
    }
    
    // Allow localhost Redis for development/testing, require proper Redis URL for production
    const isLocalhost = config.REDIS_URL === 'redis://localhost:6379';
    const isProduction = config.NODE_ENV === 'production';
    
    if (isProduction && isLocalhost) {
      // In production, don't use localhost - wait for proper Redis service
      console.log('🔶 Production mode: Redis service required - using fallback mock cache');
      return null;
    }

    try {
      const redisConfig = getRedisConfig();
      console.log('🔄 Attempting to connect to Redis:', config.REDIS_URL.replace(/\/\/.*@/, '//***@'));
      
      // Create Redis client with URL if provided, otherwise use config object
      if (config.REDIS_URL && config.REDIS_URL !== 'redis://localhost:6379') {
        redisClient = new Redis(config.REDIS_URL, redisConfig);
      } else {
        redisClient = new Redis(redisConfig);
      }
      
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
  getRedisConfig,
  createRedisConnection,
  closeRedisConnection,
  testRedisConnection,
  getRedisClient: () => redisClient
};