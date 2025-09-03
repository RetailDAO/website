const Bottleneck = require('bottleneck');

class RateLimitedApiService {
  constructor() {
    this.queues = new Map(); // Track queues per API provider
    this.lastRequestTime = new Map(); // Track last request time per API provider
    this.pendingRequests = new Map(); // Track pending requests to avoid duplicates
    this.requestQueue = []; // Global queue for batching requests
    this.processingQueue = false;
    
    // Initialize bottleneck limiters per API provider
    this.limiters = {
      coingecko: new Bottleneck({
        reservoir: 50, // 50 calls per minute
        reservoirRefreshAmount: 50,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 1, // Only 1 concurrent request
        minTime: 1200 // 1.2 seconds between requests
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

  // Rate limits per API provider (milliseconds between requests)
  getRateLimit(provider) {
    const limits = {
      'coingecko': 1500, // Optimized: ~40 calls/minute (within 50 call limit)
      'coingecko-pro': 200, // ~300 calls/minute for pro tier  
      'alpha-vantage': 12000, // 5 calls/minute
      'binance': 100 // Very generous limits
    };
    return limits[provider] || 1000;
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
          // Check if it's a rate limit error (429) and we have retries left
          if ((error.response?.status === 429 || error.code === 'ECONNRESET') && attempt < retries) {
            // Exponential backoff: 2^attempt * base delay (2, 4, 8 seconds)
            const backoffDelay = Math.pow(2, attempt + 1) * 1000;
            console.log(`[${provider}] Rate limit hit (attempt ${attempt + 1}/${retries + 1}), backing off for ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          console.error(`[${provider}] API request failed:`, error.message);
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
        
        console.error(`[${provider}] API request failed:`, error.message);
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
      
      // Clean up after request completes
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }
    
    return requestPromise;
  }
  
  // Get limiter statistics for monitoring
  getLimiterStats() {
    const stats = {};
    Object.entries(this.limiters).forEach(([provider, limiter]) => {
      stats[provider] = {
        running: limiter.running(),
        queued: limiter.queued(),
        reservoir: limiter.reservoir
      };
    });
    return stats;
  }

  // Batch multiple CoinGecko requests with intelligent spacing
  async coinGeckoBatchRequest(requests) {
    const results = [];
    const batchSize = 2; // Smaller batches to be more conservative
    
    console.log(`[coingecko] Processing ${requests.length} requests in batches of ${batchSize}`);
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map((request, index) => {
        // Stagger requests within batch by 2.5 seconds each
        return new Promise(resolve => {
          setTimeout(async () => {
            try {
              console.log(`[coingecko] Processing request ${i + index + 1}/${requests.length}: ${request.key}`);
              const result = await this.coinGeckoRequest(request.fn, request.key);
              resolve({ success: true, data: result, key: request.key });
            } catch (error) {
              console.error(`[coingecko] Request failed for ${request.key}:`, error.message);
              resolve({ success: false, error: error, key: request.key });
            }
          }, index * 2500); // 2.5 second stagger
        });
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Longer wait between batches to respect rate limits
      if (i + batchSize < requests.length) {
        const waitTime = 8000; // 8 second gap between batches
        console.log(`[coingecko] Waiting ${waitTime}ms between batches...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    console.log(`[coingecko] Batch processing completed. Success: ${results.filter(r => r.success).length}/${results.length}`);
    return results;
  }
}

module.exports = new RateLimitedApiService();