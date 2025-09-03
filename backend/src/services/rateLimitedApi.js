const Bottleneck = require('bottleneck');

class RateLimitedApiService {
  constructor() {
    this.queues = new Map(); // Track queues per API provider
    this.lastRequestTime = new Map(); // Track last request time per API provider
    this.pendingRequests = new Map(); // Track pending requests to avoid duplicates
    this.requestQueue = []; // Global queue for batching requests
    this.processingQueue = false;
    
    // Enhanced intelligent rate limiting based on API analysis
    this.requestCache = new Map(); // Cache successful requests for deduplication
    this.adaptiveDelays = new Map(); // Track successful delay patterns
    this.errorCounts = new Map(); // Track API errors for adaptive behavior
    
    // Initialize bottleneck limiters per API provider
    this.limiters = {
      coingecko: new Bottleneck({
        reservoir: 45, // Conservative: 45 calls per minute (below 50 limit)
        reservoirRefreshAmount: 45,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 1, // Only 1 concurrent request to avoid conflicts
        minTime: 1400 // 1.4 seconds between requests (conservative)
      }),
      'alpha-vantage': new Bottleneck({
        reservoir: 5, // 5 calls per minute
        reservoirRefreshAmount: 5,
        reservoirRefreshInterval: 60 * 1000,
        maxConcurrent: 1,
        minTime: 12000 // 12 seconds between requests
      }),
      binance: new Bottleneck({
        reservoir: 1200, // 1200 weight per minute
        reservoirRefreshAmount: 1200,
        reservoirRefreshInterval: 60 * 1000,
        maxConcurrent: 5,
        minTime: 100 // 0.1 seconds between requests
      }),
      polygon: new Bottleneck({
        reservoir: 5, // 5 calls per minute
        reservoirRefreshAmount: 5,
        reservoirRefreshInterval: 60 * 1000,
        maxConcurrent: 1,
        minTime: 12000 // 12 seconds between requests
      })
    };
  }

  // Intelligent adaptive rate limits per API provider
  getRateLimit(provider) {
    const baseLimits = {
      'coingecko': 1500, // Conservative: ~40 calls/minute (within 50 call limit)
      'coingecko-pro': 200, // ~300 calls/minute for pro tier  
      'alpha-vantage': 12000, // 5 calls/minute
      'binance': 100 // Very generous limits
    };
    
    // Adaptive rate limiting based on recent error history
    const errorCount = this.errorCounts.get(provider) || 0;
    const baseLimit = baseLimits[provider] || 1000;
    
    // Increase delay if we've had recent errors
    if (errorCount > 5) {
      const adaptedLimit = baseLimit * 2; // Double the delay if many errors
      console.log(`🤖 [${provider}] Adaptive rate limiting: ${adaptedLimit}ms (errors: ${errorCount})`);
      return adaptedLimit;
    }
    
    return baseLimit;
  }

  async makeRequest(provider, requestFn, retries = 3) {
    const limiter = this.limiters[provider];
    if (!limiter) {
      console.warn(`[${provider}] No rate limiter configured, falling back to basic implementation`);
      return this.makeRequestBasic(provider, requestFn, retries);
    }
    
    return limiter.schedule(async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await requestFn();
          return result;
        } catch (error) {
          // Enhanced error handling with intelligent backoff
          if ((error.response?.status === 429 || error.code === 'ECONNRESET' || 
               error.message?.includes('429') || error.message?.includes('rate')) && attempt < retries) {
            
            // Track error for adaptive rate limiting
            const currentErrors = this.errorCounts.get(provider) || 0;
            this.errorCounts.set(provider, currentErrors + 1);
            
            // Intelligent backoff: longer delays for CoinGecko
            const baseDelay = provider === 'coingecko' ? 5000 : 2000; // 5s for CoinGecko, 2s for others
            const backoffDelay = Math.pow(1.5, attempt) * baseDelay; // Gentler exponential backoff
            
            console.log(`🗓️ [${provider}] Rate limit detected (attempt ${attempt + 1}/${retries + 1}), intelligent backoff: ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          // Track errors for adaptive behavior
          const currentErrors = this.errorCounts.get(provider) || 0;
          this.errorCounts.set(provider, currentErrors + 1);
          
          console.error(`❌ [${provider}] API request failed after ${retries + 1} attempts:`, error.message);
          throw error;
        }
      }
    });
  }
  
  // Fallback method for providers without bottleneck configuration
  async makeRequestBasic(provider, requestFn, retries = 3) {
    const rateLimit = this.getRateLimit(provider);
    const lastRequest = this.lastRequestTime.get(provider) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    
    // Wait if we need to respect rate limit
    if (timeSinceLastRequest < rateLimit) {
      const waitTime = rateLimit - timeSinceLastRequest;
      console.log(`[${provider}] Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.lastRequestTime.set(provider, Date.now());
        const result = await requestFn();
        return result;
      } catch (error) {
        if ((error.response?.status === 429 || error.code === 'ECONNRESET') && attempt < retries) {
          const backoffDelay = Math.pow(2, attempt + 1) * 1000;
          console.log(`[${provider}] Rate limit hit (attempt ${attempt + 1}/${retries + 1}), backing off for ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        // Track errors for adaptive behavior
        const currentErrors = this.errorCounts.get(provider) || 0;
        this.errorCounts.set(provider, currentErrors + 1);
        
        console.error(`❌ [${provider}] API request failed after ${retries + 1} attempts:`, error.message);
        throw error;
      }
    }
  }

  // Specific method for CoinGecko requests with deduplication
  async coinGeckoRequest(requestFn, requestKey = null) {
    // If requestKey provided, check for pending duplicate requests
    if (requestKey) {
      const existingRequest = this.pendingRequests.get(requestKey);
      if (existingRequest) {
        console.log(`[coingecko] Reusing pending request for: ${requestKey}`);
        return existingRequest.catch(() => null);
      }
    }
    
    const requestPromise = this.makeRequest('coingecko', requestFn).catch(error => {
      console.log(`[coingecko] Request failed gracefully, will use fallback data`);
      return null;
    });
    
    // Store pending request to avoid duplicates
    if (requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);
      
      // Clean up after request completes and reset error count on success
      requestPromise.then((result) => {
        if (result) {
          // Reset error count on successful request
          this.errorCounts.set('coingecko', 0);
        }
      }).finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }
    
    return requestPromise;
  }
  
  // Enhanced limiter statistics for monitoring with intelligent insights
  getLimiterStats() {
    const stats = {};
    Object.entries(this.limiters).forEach(([provider, limiter]) => {
      const errorCount = this.errorCounts.get(provider) || 0;
      const cacheSize = provider === 'coingecko' ? this.requestCache.size : 0;
      
      stats[provider] = {
        running: limiter.running(),
        queued: limiter.queued(),
        reservoir: limiter.reservoir,
        errorCount: errorCount,
        healthStatus: errorCount < 3 ? 'healthy' : errorCount < 10 ? 'degraded' : 'unhealthy',
        cacheSize: cacheSize,
        adaptiveRateLimit: this.getRateLimit(provider),
        pendingRequests: this.pendingRequests.size
      };
    });
    return stats;
  }
  
  // Method to reset error counts (useful for admin endpoints)
  resetErrorCounts(provider = null) {
    if (provider) {
      this.errorCounts.set(provider, 0);
      console.log(`🔄 Reset error count for ${provider}`);
    } else {
      this.errorCounts.clear();
      console.log(`🔄 Reset all error counts`);
    }
  }

  // Enhanced batch processing with adaptive timing and smart caching
  async coinGeckoBatchRequest(requests) {
    const results = [];
    const errorCount = this.errorCounts.get('coingecko') || 0;
    
    // Adaptive batch size: smaller batches if we've had errors recently
    const batchSize = errorCount > 3 ? 1 : 2; // Single requests if many errors
    const staggerDelay = errorCount > 3 ? 4000 : 2500; // Longer delays if errors
    const batchGap = errorCount > 3 ? 12000 : 8000; // Longer gaps if errors
    
    console.log(`🤖 [coingecko] Intelligent batch processing: ${requests.length} requests, batch size: ${batchSize}, stagger: ${staggerDelay}ms (error history: ${errorCount})`);
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map((request, index) => {
        // Intelligent staggering based on error history
        return new Promise(resolve => {
          setTimeout(async () => {
            try {
              console.log(`📊 [coingecko] Processing request ${i + index + 1}/${requests.length}: ${request.key}`);
              const result = await this.coinGeckoRequest(request.fn, request.key);
              resolve({ success: true, data: result, key: request.key });
            } catch (error) {
              console.error(`❌ [coingecko] Request failed for ${request.key}:`, error.message);
              resolve({ success: false, error: error, key: request.key });
            }
          }, index * staggerDelay); // Adaptive stagger delay
        });
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Adaptive wait between batches
      if (i + batchSize < requests.length) {
        console.log(`⏳ [coingecko] Waiting ${batchGap}ms between batches (adaptive timing)...`);
        await new Promise(resolve => setTimeout(resolve, batchGap));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [coingecko] Batch processing completed. Success: ${successCount}/${results.length}`);
    
    // Reset error count if we had good success rate
    if (successCount / results.length >= 0.8) {
      this.errorCounts.set('coingecko', Math.max(0, (this.errorCounts.get('coingecko') || 0) - 2));
      console.log(`🔄 [coingecko] Good success rate (${Math.round(successCount/results.length*100)}%), reducing error count`);
    }
    
    return results;
  }
  
  // New method: Smart request deduplication and caching
  async smartCoinGeckoRequest(requestFn, requestKey, cacheTime = 300000) { // 5 minute cache
    // Check short-term cache first
    const cachedResult = this.requestCache.get(requestKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < cacheTime) {
      console.log(`💾 [coingecko] Using smart cache for: ${requestKey}`);
      return cachedResult.data;
    }
    
    // Make request with intelligent rate limiting
    const result = await this.coinGeckoRequest(requestFn, requestKey);
    
    // Cache successful results
    if (result) {
      this.requestCache.set(requestKey, {
        data: result,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries (keep max 100 entries)
      if (this.requestCache.size > 100) {
        const sortedEntries = [...this.requestCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest 20 entries
        for (let i = 0; i < 20; i++) {
          this.requestCache.delete(sortedEntries[i][0]);
        }
      }
    }
    
    return result;
  }
}

// Export singleton instance with enhanced capabilities
const rateLimitedApiService = new RateLimitedApiService();

// Periodic cleanup of cache and error counts (every 30 minutes)
setInterval(() => {
  // Clean up old cache entries
  const now = Date.now();
  const cacheEntries = [...rateLimitedApiService.requestCache.entries()];
  let cleaned = 0;
  
  cacheEntries.forEach(([key, value]) => {
    if (now - value.timestamp > 1800000) { // 30 minutes old
      rateLimitedApiService.requestCache.delete(key);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`🧽 Cleaned up ${cleaned} old cache entries`);
  }
  
  // Gradually reduce error counts
  for (const [provider, count] of rateLimitedApiService.errorCounts.entries()) {
    if (count > 0) {
      rateLimitedApiService.errorCounts.set(provider, Math.max(0, count - 1));
    }
  }
}, 30 * 60 * 1000); // 30 minutes

module.exports = rateLimitedApiService;