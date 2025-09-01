class RateLimitedApiService {
  constructor() {
    this.queues = new Map(); // Track queues per API provider
    this.lastRequestTime = new Map(); // Track last request time per API provider
  }

  // Rate limits per API provider (milliseconds between requests)
  getRateLimit(provider) {
    const limits = {
      'coingecko': 1500, // More conservative: ~40 calls/minute for free tier
      'coingecko-pro': 200, // ~300 calls/minute for pro tier  
      'alpha-vantage': 12000, // 5 calls/minute
      'binance': 100 // Very generous limits
    };
    return limits[provider] || 1000;
  }

  async makeRequest(provider, requestFn, retries = 3) {
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
  }

  // Specific method for CoinGecko requests
  async coinGeckoRequest(requestFn) {
    return this.makeRequest('coingecko', requestFn);
  }
}

module.exports = new RateLimitedApiService();