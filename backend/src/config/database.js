const Redis = require('ioredis');
const config = require('./environment');

// Use Railway's provided Redis connection variables
const getRedisConfig = () => {
  const baseConfig = {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Changed to true to prevent immediate connection issues
    keepAlive: 30000,
    connectTimeout: 15000, // Increased timeout for Railway
    commandTimeout: 15000, // Increased timeout for Railway
    family: 0, // Enable dual-stack (IPv4/IPv6) resolution for Railway
    dns: {
      // Add DNS resolution options for Railway
      timeout: 10000,
      retries: 3
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    retryDelayOnClusterDown: 300,
    enableReadyCheck: true,
    retryDelayOnError: 3000 // Increased retry delay for Railway
  };

  // Railway Redis URLs support TLS for external connections
  const tlsConfig = config.REDIS_URL && config.REDIS_URL.includes('rediss://') ? {} : null;

  return {
    ...baseConfig,
    tls: tlsConfig
  };
};

let redisClient = null;

const createRedisConnection = () => {
  if (!redisClient) {
    // Priority order for Redis connection:
    // 1. REDIS_PRIVATE_URL (for Railway internal network)
    // 2. REDIS_URL (standard Railway Redis URL)  
    // 3. REDISCLOUD_URL (alternative Railway Redis variable)
    // 4. DATABASE_URL if it's a Redis URL
    const redisUrl = config.REDIS_PRIVATE_URL || config.REDIS_URL || process.env.REDISCLOUD_URL || 
                     (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('redis') ? process.env.DATABASE_URL : null);
    
    if (!redisUrl) {
      console.log('🔶 Redis URL not configured - using fallback mock cache');
      console.log('🔶 Available env vars:', Object.keys(process.env).filter(key => key.includes('REDIS') || key.includes('DATABASE')));
      return null;
    }

    try {
      const redisConfig = getRedisConfig();
      console.log('🔄 Attempting to connect to Redis via:', redisUrl.replace(/\/\/.*@/, '//***@'));
      
      // Create Redis client using Railway's provided URL
      redisClient = new Redis(redisUrl, redisConfig);
      
      redisClient.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
          console.log('🔶 Redis unavailable - application will use mock cache mode');
          console.log('🔶 Attempted connection to:', redisUrl.replace(/\/\/.*@/, '//***@'));
          
          // Log Railway-specific troubleshooting info
          if (redisUrl.includes('railway.internal')) {
            console.log('🚧 Railway Internal Network Issue Detected:');
            console.log('   - Ensure Redis service is connected to this app');
            console.log('   - Verify REDIS_URL or REDIS_PRIVATE_URL environment variables');
            console.log('   - Check Railway service health in dashboard');
          }
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

      // Test connection immediately
      redisClient.ping().then(() => {
        console.log('✅ Initial Redis ping successful');
      }).catch((err) => {
        console.error('❌ Initial Redis ping failed:', err.message);
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