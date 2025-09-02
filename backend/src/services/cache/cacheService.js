const { createRedisConnection } = require('../../config/database');
const config = require('../../config/environment');
const goldenDatasetService = require('./goldenDatasetService');

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map(); // Fallback memory cache
    this.initRedis();

    // Cache metrics for monitoring
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0
    };

    // Optimized tiered caching strategy TTL values for rate limit management
    this.cacheTiers = {
      tier1_realtime: 60,       // 1 min - real-time data
      tier2_frequent: 3600,     // 1 hour - frequently updated (was 30min, now longer to reduce calls)
      tier3_stable: 21600,      // 6 hours - stable/slow-changing data (was 4h, increased)
      tier4_historical: 172800  // 48 hours - historical data (was 24h, doubled for rate limits)
    };
  }

  async initRedis() {
    try {
      this.redis = createRedisConnection();
      if (!this.redis) {
        console.log('🔶 Using memory cache fallback - Redis not available');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      console.log('🔶 Falling back to memory cache');
    }
  }

  isRedisAvailable() {
    return this.redis && this.redis.status === 'ready';
  }

  // Fallback memory cache methods
  setMemoryCache(key, data, ttl) {
    const expiryTime = Date.now() + (ttl * 1000);
    this.memoryCache.set(key, { data, expiryTime });
    
    // Clean up expired entries occasionally
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  getMemoryCache(key) {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiryTime) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now > value.expiryTime) {
        this.memoryCache.delete(key);
      }
    }
  }

  async get(key) {
    try {
      let data = null;
      if (this.isRedisAvailable()) {
        data = await this.redis.get(key);
        data = data ? JSON.parse(data) : null;
      } else {
        data = this.getMemoryCache(key);
      }
      
      // Track cache metrics
      if (data !== null) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      
      return data;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Cache get error:', error.message);
      // Try memory cache as fallback
      const fallbackData = this.getMemoryCache(key);
      if (fallbackData !== null) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      return fallbackData;
    }
  }

  async set(key, data, ttl = config.CACHE_TTL) {
    try {
      if (this.isRedisAvailable()) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        return true;
      } else {
        this.setMemoryCache(key, data, ttl);
        return true;
      }
    } catch (error) {
      console.error('❌ Cache set error:', error.message);
      // Fallback to memory cache
      this.setMemoryCache(key, data, ttl);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.isRedisAvailable()) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error.message);
      this.memoryCache.delete(key);
      return false;
    }
  }

  async flush() {
    try {
      if (this.isRedisAvailable()) {
        await this.redis.flushall();
      }
      this.memoryCache.clear();
      return true;
    } catch (error) {
      console.error('❌ Cache flush error:', error.message);
      this.memoryCache.clear();
      return false;
    }
  }

  // Tiered caching methods
  async setTiered(key, data, tier = 'tier2_frequent') {
    const ttl = this.cacheTiers[tier] || this.cacheTiers.tier2_frequent;
    return this.set(key, data, ttl);
  }

  async setRealtime(key, data) {
    return this.setTiered(key, data, 'tier1_realtime');
  }

  async setFrequent(key, data) {
    return this.setTiered(key, data, 'tier2_frequent');
  }

  async setStable(key, data) {
    return this.setTiered(key, data, 'tier3_stable');
  }

  async setHistorical(key, data) {
    return this.setTiered(key, data, 'tier4_historical');
  }

  // Batch operations for performance
  async mget(keys) {
    try {
      if (this.isRedisAvailable()) {
        const results = await this.redis.mget(keys);
        return results.map(result => result ? JSON.parse(result) : null);
      } else {
        return keys.map(key => this.getMemoryCache(key));
      }
    } catch (error) {
      console.error('❌ Cache mget error:', error.message);
      return keys.map(key => this.getMemoryCache(key));
    }
  }

  async mset(keyValuePairs, ttl = config.CACHE_TTL) {
    try {
      if (this.isRedisAvailable()) {
        const pipeline = this.redis.pipeline();
        keyValuePairs.forEach(([key, value]) => {
          pipeline.setex(key, ttl, JSON.stringify(value));
        });
        await pipeline.exec();
        return true;
      } else {
        keyValuePairs.forEach(([key, value]) => {
          this.setMemoryCache(key, value, ttl);
        });
        return true;
      }
    } catch (error) {
      console.error('❌ Cache mset error:', error.message);
      // Fallback to memory cache
      keyValuePairs.forEach(([key, value]) => {
        this.setMemoryCache(key, value, ttl);
      });
      return false;
    }
  }

  // Cache warming for frequently accessed data
  async warmCache(warmingData) {
    try {
      if (this.isRedisAvailable()) {
        const pipeline = this.redis.pipeline();
        Object.entries(warmingData).forEach(([key, { data, tier }]) => {
          const ttl = this.cacheTiers[tier] || this.cacheTiers.tier2_frequent;
          pipeline.setex(key, ttl, JSON.stringify(data));
        });
        await pipeline.exec();
        console.log(`✅ Cache warmed with ${Object.keys(warmingData).length} items`);
        return true;
      } else {
        Object.entries(warmingData).forEach(([key, { data, tier }]) => {
          const ttl = this.cacheTiers[tier] || this.cacheTiers.tier2_frequent;
          this.setMemoryCache(key, data, ttl);
        });
        console.log(`🔶 Memory cache warmed with ${Object.keys(warmingData).length} items`);
        return true;
      }
    } catch (error) {
      console.error('❌ Cache warming error:', error.message);
      return false;
    }
  }

  // Cache-aside pattern helper for API responses
  async getOrFetch(key, fetchFunction, ttl = null, tier = 'tier2_frequent') {
    try {
      // Try to get from cache first
      let data = await this.get(key);
      
      if (data !== null) {
        return data;
      }
      
      // If not in cache, fetch the data
      data = await fetchFunction();
      
      // Store in cache for future requests
      if (data !== null && data !== undefined) {
        if (ttl) {
          await this.set(key, data, ttl);
        } else {
          await this.setTiered(key, data, tier);
        }
      }
      
      return data;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Cache-aside pattern error:', error.message);
      // Still try to fetch the data even if caching fails
      try {
        return await fetchFunction();
      } catch (fetchError) {
        console.error('❌ Fallback fetch also failed:', fetchError.message);
        throw fetchError;
      }
    }
  }

  // Get cache metrics and performance stats
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      total: total,
      memoryEntries: this.memoryCache.size,
      redisAvailable: this.isRedisAvailable()
    };
  }

  // Reset metrics (useful for monitoring intervals)
  resetMetrics() {
    this.metrics.hits = 0;
    this.metrics.misses = 0;
    this.metrics.errors = 0;
  }

  // Enhanced cache-aside pattern with golden dataset integration
  async getOrFetchWithGolden(key, fetchFunction, options = {}) {
    const {
      ttl = null,
      tier = 'tier2_frequent',
      dataType = null, // For golden dataset storage
      enableGolden = true
    } = options;

    try {
      // 1. Try regular cache first (fastest)
      let data = await this.get(key);
      if (data !== null) {
        return { data, source: 'cache', fresh: true };
      }

      // 2. Try golden dataset if enabled and dataType provided
      if (enableGolden && dataType) {
        const goldenResult = await goldenDatasetService.retrieve(dataType, ['fresh', 'stale']);
        if (goldenResult) {
          // Store golden data in regular cache for faster future access
          if (ttl) {
            await this.set(key, goldenResult.data, ttl);
          } else {
            await this.setTiered(key, goldenResult.data, tier);
          }
          
          console.log(`🥇 Serving from golden dataset: ${dataType} (${goldenResult.metadata.tier} tier)`);
          return {
            data: goldenResult.data,
            source: 'golden',
            fresh: goldenResult.metadata.tier === 'fresh',
            metadata: goldenResult.metadata
          };
        }
      }

      // 3. Fetch fresh data from API
      console.log(`🌐 Fetching fresh data for key: ${key}`);
      data = await fetchFunction();

      if (data !== null && data !== undefined) {
        // Store in regular cache
        if (ttl) {
          await this.set(key, data, ttl);
        } else {
          await this.setTiered(key, data, tier);
        }

        // Store in golden dataset if enabled
        if (enableGolden && dataType) {
          await goldenDatasetService.store(dataType, data, 'fresh');
        }

        return { data, source: 'api', fresh: true };
      }

      // 4. Fallback to archived golden dataset if available
      if (enableGolden && dataType) {
        const archivedResult = await goldenDatasetService.retrieve(dataType, ['archived', 'fallback']);
        if (archivedResult) {
          console.log(`📦 Fallback to archived golden dataset: ${dataType} (${archivedResult.metadata.tier} tier)`);
          return {
            data: archivedResult.data,
            source: 'golden_fallback',
            fresh: false,
            metadata: archivedResult.metadata
          };
        }
      }

      return { data: null, source: 'none', fresh: false };

    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Enhanced cache-aside pattern error:', error.message);
      
      // Emergency fallback to any available golden data
      if (enableGolden && dataType) {
        try {
          const emergencyResult = await goldenDatasetService.retrieve(dataType, ['fresh', 'stale', 'archived', 'fallback']);
          if (emergencyResult) {
            console.log(`🚨 Emergency fallback to golden dataset: ${dataType}`);
            return {
              data: emergencyResult.data,
              source: 'golden_emergency',
              fresh: false,
              metadata: emergencyResult.metadata
            };
          }
        } catch (goldenError) {
          console.error('❌ Golden dataset emergency fallback failed:', goldenError.message);
        }
      }

      // Final fallback - try to fetch data directly
      try {
        const data = await fetchFunction();
        if (data !== null && data !== undefined) {
          // Still try to store in golden dataset for future use
          if (enableGolden && dataType) {
            await goldenDatasetService.store(dataType, data, 'fresh');
          }
          return { data, source: 'api_direct', fresh: true };
        }
      } catch (fetchError) {
        console.error('❌ Direct fetch also failed:', fetchError.message);
      }

      throw new Error(`All cache strategies failed for key: ${key}`);
    }
  }

  // Batch store successful API responses in golden dataset
  async storeMultipleInGolden(dataMap) {
    try {
      const results = {};
      for (const [dataType, data] of Object.entries(dataMap)) {
        if (data !== null && data !== undefined) {
          results[dataType] = await goldenDatasetService.store(dataType, data, 'fresh');
        }
      }
      return results;
    } catch (error) {
      console.error('❌ Batch golden dataset storage failed:', error.message);
      return {};
    }
  }

  // Get cache and golden dataset combined health status
  async getEnhancedHealth() {
    try {
      const cacheHealth = await this.healthCheck();
      const goldenStats = await goldenDatasetService.getStats();
      
      return {
        cache: cacheHealth,
        goldenDataset: {
          status: goldenStats.error ? 'degraded' : 'healthy',
          ...goldenStats
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        cache: { status: 'degraded', error: error.message },
        goldenDataset: { status: 'degraded', error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Periodic maintenance for golden dataset
  async performMaintenance() {
    try {
      console.log('🔧 Performing cache maintenance...');
      
      // Clean up memory cache
      this.cleanupMemoryCache();
      
      // Clean up golden dataset
      const cleanedCount = await goldenDatasetService.cleanup();
      
      // Get updated stats
      const stats = await this.getEnhancedHealth();
      
      console.log('✅ Cache maintenance completed');
      return {
        memoryEntriesCleared: this.memoryCache.size,
        goldenEntriesProcessed: cleanedCount,
        health: stats
      };
    } catch (error) {
      console.error('❌ Cache maintenance failed:', error.message);
      return { error: error.message };
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const metrics = this.getMetrics();
      
      if (this.isRedisAvailable()) {
        await this.redis.ping();
        return { 
          status: 'healthy', 
          type: 'redis',
          metrics: metrics
        };
      } else {
        return { 
          status: 'healthy', 
          type: 'memory', 
          entries: this.memoryCache.size,
          metrics: metrics
        };
      }
    } catch (error) {
      return { 
        status: 'degraded', 
        type: 'memory', 
        entries: this.memoryCache.size,
        error: error.message
      };
    }
  }
}

module.exports = new CacheService();