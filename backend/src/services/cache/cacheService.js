const Redis = require('ioredis');
const config = require('../../config/environment');

class CacheService {
  constructor() {
    this.redis = new Redis(config.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    // Tiered caching strategy TTL values
    this.cacheTiers = {
      tier1_realtime: 60,      // 1 min - real-time data
      tier2_frequent: 1800,    // 30 min - frequently updated data
      tier3_stable: 14400,     // 4 hours - stable/slow-changing data
      tier4_historical: 86400  // 24 hours - historical data
    };
  }

  async get(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = config.CACHE_TTL) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async flush() {
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
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
      const results = await this.redis.mget(keys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs, ttl = config.CACHE_TTL) {
    try {
      const pipeline = this.redis.pipeline();
      keyValuePairs.forEach(([key, value]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Cache warming for frequently accessed data
  async warmCache(warmingData) {
    try {
      const pipeline = this.redis.pipeline();
      Object.entries(warmingData).forEach(([key, { data, tier }]) => {
        const ttl = this.cacheTiers[tier] || this.cacheTiers.tier2_frequent;
        pipeline.setex(key, ttl, JSON.stringify(data));
      });
      await pipeline.exec();
      console.log(`✅ Cache warmed with ${Object.keys(warmingData).length} items`);
      return true;
    } catch (error) {
      console.error('Cache warming error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();