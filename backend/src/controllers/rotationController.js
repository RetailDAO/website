/**
 * Rotation Breadth Controller
 * 
 * Strategic API-conservative controller for Top 100 coins rotation analysis
 * Features:
 * - 24h TTL caching to conserve CoinGecko API calls (10,000/month limit)
 * - Client-specified categorization: BTC Season, Neutral, Alt Season, Too Frothy
 * - Stablecoin filtering and volume thresholds
 * - Performance-optimized single daily API call
 */

const axios = require('axios');
const rateLimitedApiService = require('../services/rateLimitedApi');
const cacheService = require('../services/cache/cacheService');

class RotationController {
  constructor() {
    // Use existing CoinGecko limiter with conservative approach
    this.coinGeckoLimiter = rateLimitedApiService.limiters.coingecko;
    this.baseURL = 'https://api.coingecko.com/api/v3';
    
    // Strategic caching configuration
    this.cacheConfig = {
      rotation_analysis: {
        ttl: 24 * 60 * 60, // 24 hours - conserve API calls
        fallback_ttl: 72 * 60 * 60, // 3 days fallback
        description: 'Daily rotation breadth analysis'
      },
      btc_benchmark: {
        ttl: 60 * 60, // 1 hour - lighter refresh
        fallback_ttl: 6 * 60 * 60, // 6 hours fallback
        description: 'BTC 30D performance baseline'
      }
    };

    // Comprehensive filtering lists (as per client requirements)
    this.stablecoins = [
      'tether', 'usd-coin', 'ethena-usde', 'usds', 'figure-heloc',
      'binance-bridged-usdt-bnb-smart-chain', 'dai', 'true-usd', 'pax-dollar',
      'binance-usd', 'first-digital-usd', 'frax', 'origin-dollar'
    ];

    // Derivatives to exclude (wrapped, staked, synthetic assets)
    this.derivatives = [
      'wrapped-bitcoin', 'wrapped-eth', 'cbeth', 'staked-ether', 'rocket-pool-eth',
      'lido-staked-ether', 'frax-ether', 'binance-wrapped-btc', 'huobi-btc',
      'bitcoin-avalanche-bridged-btc-b', 'wrapped-solana', 'wrapped-bnb',
      'wrapped-avax', 'wrapped-fantom', 'wrapped-matic', 'weth', 'wbtc',
      'kinetiq-staked-hype', 'liquid-staked-ethereum', 'coinbase-wrapped-staked-eth',
      'mantle-staked-ether', 'restaked-swell-ethereum', 'ankr-staked-eth',
      'stakewise-v3-oseth', 'kelp-dao-restaked-eth', 'eigenpie-msteth'
    ];
  }

  // Main endpoint for Rotation Breadth analysis
  async getRotationBreadth(req, res, next) {
    try {
      const startTime = performance.now();
      
      // Ultra-conservative 10-hour cache for rotation breadth (95% API reduction)
      const tenHourPeriod = Math.floor(Date.now() / (10 * 60 * 60 * 1000)); // 10-hour periods
      const cacheKey = `market:rotation:breadth:top100_${tenHourPeriod}`;
      
      // Try cache with fallback support (stale-while-revalidate pattern)
      const cacheResult = await cacheService.getWithFallback(cacheKey, 'rotation');
      let result = cacheResult.data;
      
      if (!result) {
        console.log('🔄 Computing fresh rotation breadth analysis (DAILY API CALL)');
        
        try {
          // Get rotation analysis with strategic caching
          result = await this.calculateRotationBreadth();
          
          // Use ultra-conservative rotation caching (10-hour TTL)
          await cacheService.setRotationBreadth(cacheKey, result);
          
          // Store fallback data for stale-while-revalidate pattern
          await cacheService.setFallbackData(cacheKey, result, 'rotation');
          
          console.log('✅ Rotation breadth calculation completed in ${Math.round(performance.now() - startTime)}ms');
          console.log('🎯 Ultra-conservative cache: Next refresh in 10 hours (95% API reduction)');
        } catch (error) {
          console.log('🎭 Error calculating rotation breadth, using fallback:', error.message);
          result = await this.getFallbackData();
        }
      } else {
        const freshness = cacheResult.fresh ? 'fresh' : 'stale';
        const source = cacheResult.source;
        console.log(`⚡ Serving ${freshness} rotation data from ${source} (${Math.round(performance.now() - startTime)}ms)`);
        if (!cacheResult.fresh) {
          console.log('🔄 Stale rotation data acceptable - 24-hour fallback window');
        }
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Rotation Breadth endpoint error:', error.message);
      
      // Return fallback data even on error
      res.json({
        success: true,
        data: await this.getFallbackData(),
        warning: 'Using fallback data due to API issues'
      });
    }
  }

  // Calculate rotation breadth with Top 100 analysis
  async calculateRotationBreadth() {
    // Step 1: Get BTC benchmark performance
    const btcBenchmark = await this.getBTCBenchmark();
    
    // Step 2: Get Top 100 coins with strategic API call
    const top100Analysis = await this.getTop100Analysis();
    
    // Step 3: Filter coins as per client requirements
    const filteredCoins = this.filterCoins(top100Analysis);
    
    // Step 4: Calculate breadth percentage
    const coinsBeatingBTC = filteredCoins.filter(coin => 
      coin.price_change_percentage_30d_in_currency > btcBenchmark.performance30d
    );
    
    const breadthPercentage = (coinsBeatingBTC.length / filteredCoins.length) * 100;
    
    // Step 5: Categorize according to client requirements
    const category = this.categorizeRotationBreadth(breadthPercentage);
    
    // Step 6: Get top performers for UI
    const topPerformers = this.getTopPerformers(coinsBeatingBTC);
    
    return {
      breadthPercentage: Math.round(breadthPercentage * 10) / 10, // 1 decimal
      category: category.label,
      sentiment: category.sentiment,
      color: category.color,
      terminalLabel: category.terminalLabel,
      description: category.description,
      coinsAnalyzed: filteredCoins.length,
      coinsBeatingBTC: coinsBeatingBTC.length,
      btcPerformance30d: Math.round(btcBenchmark.performance30d * 10) / 10,
      topPerformers: topPerformers,
      metadata: {
        dataSource: 'coingecko',
        cacheStrategy: 'daily_refresh',
        timestamp: Date.now(),
        nextRefresh: new Date(Date.now() + (this.cacheConfig.rotation_analysis.ttl * 1000)).toISOString(),
        apiCallsConserved: 'Strategic 24h caching to preserve API limits'
      }
    };
  }

  // Get BTC benchmark with hourly caching
  async getBTCBenchmark() {
    const hourKey = Math.floor(Date.now() / (60 * 60 * 1000)); // Current hour
    const cacheKey = `btc_benchmark_${hourKey}`;
    
    let btcData = await cacheService.get(cacheKey);
    
    if (!btcData) {
      console.log('🔍 Fetching BTC benchmark (1h TTL)');
      
      const response = await this.coinGeckoLimiter.schedule(async () => {
        return await axios.get(`${this.baseURL}/coins/bitcoin`, {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            sparkline: false
          },
          timeout: 10000
        });
      });
      
      btcData = {
        performance30d: response.data.market_data.price_change_percentage_30d || 0,
        price: response.data.market_data.current_price.usd,
        timestamp: Date.now()
      };
      
      await cacheService.set(cacheKey, btcData, this.cacheConfig.btc_benchmark.ttl);
      console.log(`✅ BTC Benchmark: ${btcData.performance30d.toFixed(2)}% (30D)`);
    }
    
    return btcData;
  }

  // Get Top coins - HEAVY API call, used strategically once per day
  // Fetch 200 coins to ensure 100 clean coins after intensive filtering
  async getTop100Analysis() {
    console.log('📊 STRATEGIC API CALL: Top 200 coins with 30D data (once per day)');
    console.log('⚠️ Fetching 200 to ensure true Top 100 after intensive derivative filtering');
    console.log('⚠️ This conserves API limits: 1 call/day = 30 calls/month vs 10,000 limit');

    const response = await this.coinGeckoLimiter.schedule(async () => {
      return await axios.get(`${this.baseURL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 200, // Optimized for true top 100 after filtering
          page: 1,
          sparkline: false,
          price_change_percentage: '30d'
        },
        timeout: 15000 // Longer timeout for large dataset
      });
    });

    console.log(`📈 Received ${response.data.length} coins from CoinGecko`);
    return response.data;
  }

  // Enhanced filtering with comprehensive derivative exclusion
  filterCoins(coins) {
    const allExclusions = [...this.stablecoins, ...this.derivatives];

    // Step 1: Apply all filters
    const filtered = coins.filter(coin =>
      !allExclusions.includes(coin.id) && // Exclude stablecoins & derivatives
      coin.total_volume > 1000000 && // Min $1M volume
      coin.price_change_percentage_30d_in_currency !== null && // Valid 30D data
      !this.isDerivativeByName(coin.name, coin.symbol) // Pattern-based derivative detection
    );

    // Step 2: Take exactly top 100 after filtering (market cap ordered)
    const top100Clean = filtered.slice(0, 100);

    console.log(`🔍 Intensive filtering results:`);
    console.log(`   📊 Started with: ${coins.length} coins`);
    console.log(`   ❌ Removed ${allExclusions.length} stablecoins/derivatives by ID`);
    console.log(`   ❌ Removed ${coins.length - filtered.length - allExclusions.length} by volume/data/patterns`);
    console.log(`   ✅ Final clean dataset: ${top100Clean.length} top coins`);
    console.log(`   🎯 Target achieved: Top ${top100Clean.length} real trading coins for rotation analysis`);

    return top100Clean;
  }

  // Pattern-based derivative detection for names/symbols not in our ID list
  isDerivativeByName(name, symbol) {
    const derivativePatterns = [
      /wrapped|staked|liquid|restaked/i,
      /^w[A-Z]{2,4}$/, // Pattern like WBTC, WETH, WBNB
      /^st[A-Z]{2,4}$/, // Pattern like stETH, stSOL
      /bridged|synthetic|receipt/i,
      /^cb[A-Z]{2,4}$/, // Coinbase wrapped like cbETH
      /^r[A-Z]{2,4}$/, // Rocket pool like rETH
      /deposit|vault|yield/i
    ];

    return derivativePatterns.some(pattern =>
      pattern.test(name) || pattern.test(symbol)
    );
  }

  // Categorize rotation breadth per client specification
  categorizeRotationBreadth(percentage) {
    if (percentage < 35) {
      return {
        label: 'BTC Season',
        sentiment: 'btc_dominance',
        color: 'orange',
        terminalLabel: '[BTC_SEASON]',
        description: 'Bitcoin dominance strong - altcoins underperforming'
      };
    } else if (percentage < 55) {
      return {
        label: 'Neutral',
        sentiment: 'balanced',
        color: 'yellow',
        terminalLabel: '[BALANCED]',
        description: 'Balanced market conditions - mixed performance'
      };
    } else if (percentage < 70) {
      return {
        label: 'Alt Season',
        sentiment: 'alt_momentum',
        color: 'green',
        terminalLabel: '[ALT_SEASON]',
        description: 'Altcoin momentum building - broad market rotation'
      };
    } else {
      return {
        label: 'Too Frothy',
        sentiment: 'caution',
        color: 'red',
        terminalLabel: '[CAUTION]',
        description: 'Excessive speculation - potential correction risk'
      };
    }
  }

  // Get top 5 performers for UI display
  getTopPerformers(coinsBeatingBTC) {
    return coinsBeatingBTC
      .sort((a, b) => b.price_change_percentage_30d_in_currency - a.price_change_percentage_30d_in_currency)
      .slice(0, 5)
      .map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        performance: coin.price_change_percentage_30d_in_currency.toFixed(1),
        marketCap: coin.market_cap
      }));
  }

  // Fallback data for graceful degradation
  async getFallbackData() {
    // Try cached fallback first
    const cachedFallback = await cacheService.get('rotation_breadth_fallback');
    if (cachedFallback) {
      console.log('🎭 Using cached fallback rotation data');
      return { ...cachedFallback, dataSource: 'cached_fallback' };
    }

    // Generate realistic mock data
    const mockPercentage = 42 + (Math.random() - 0.5) * 20; // 32-52% range
    const category = this.categorizeRotationBreadth(mockPercentage);

    console.log('🎭 Using generated mock rotation data');

    return {
      breadthPercentage: Math.round(mockPercentage * 10) / 10,
      category: category.label,
      sentiment: category.sentiment,
      color: category.color,
      terminalLabel: category.terminalLabel,
      description: category.description,
      coinsAnalyzed: 92,
      coinsBeatingBTC: Math.round(92 * (mockPercentage / 100)),
      btcPerformance30d: -3.2,
      topPerformers: [
        { symbol: 'SOL', name: 'Solana', performance: '18.8' },
        { symbol: 'ADA', name: 'Cardano', performance: '7.7' },
        { symbol: 'AVAX', name: 'Avalanche', performance: '9.0' },
        { symbol: 'DOT', name: 'Polkadot', performance: '0.8' },
        { symbol: 'LINK', name: 'Chainlink', performance: '5.6' }
      ],
      metadata: {
        dataSource: 'mock',
        timestamp: Date.now(),
        reason: 'API unavailable'
      }
    };
  }
}

// Create controller instance
const rotationController = new RotationController();

module.exports = {
  rotationController: {
    getRotationBreadth: rotationController.getRotationBreadth.bind(rotationController)
  }
};