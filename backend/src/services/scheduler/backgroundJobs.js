const cron = require('node-cron');
const cacheService = require('../cache/cacheService');
const { CryptoDataService } = require('../dataProviders/cryptoDataservice');
const movingAverageService = require('../analysis/movingAverageService');

const cryptoService = new CryptoDataService();

/**
 * Background Job Scheduler for Market Overview v2 Cache-First System
 * 
 * Implements ultra-conservative caching with volatility-based tiers:
 * - Moving Averages: 1-hour (high volatility)
 * - Leverage State: 3-hour (medium volatility) 
 * - Futures Basis: 5-hour (medium volatility)
 * - ETF Flows: 24-hour (daily refresh for freshness)
 * - Rotation Breadth: 10-hour (low volatility)
 * - Liquidity Pulse: 20-hour (very low volatility)
 */

class BackgroundJobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.stats = {
      jobsExecuted: 0,
      lastExecution: null,
      errors: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Start all background jobs based on volatility tiers
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Background jobs already running');
      return;
    }

    console.log('🚀 Starting Market Overview v2 background job scheduler...');
    
    // Tier 1: High Volatility (1 hour) - Moving Averages
    this.scheduleMovingAveragesJob();
    
    // Tier 2: Medium Volatility (3-5 hours) - Leverage & Futures
    this.scheduleLeverageStateJob();
    this.scheduleFuturesBasisJob();
    
    // Tier 3: Low Volatility (10-20 hours) - Rotation & Liquidity
    this.scheduleRotationBreadthJob();
    this.scheduleLiquidityPulseJob();
    
    // Tier 4: Daily Refresh (24 hours) - ETF Flows
    this.scheduleETFFlowsJob();
    
    // Health monitoring job (every 30 minutes)
    this.scheduleHealthMonitorJob();
    
    this.isRunning = true;
    console.log(`✅ Scheduled ${this.jobs.size} background jobs for cache population`);
    this.printSchedule();
  }

  /**
   * Tier 1: Moving Averages (Every hour at minute 0)
   */
  scheduleMovingAveragesJob() {
    const job = cron.schedule('0 * * * *', async () => {
      await this.executeWithErrorHandling('moving-averages', async () => {
        console.log('🔄 [Background] Updating Moving Averages cache...');
        
        // Get fresh BTC data for MA calculations
        const btcData = await cryptoService.getBTCData('220D');
        const currentPrice = btcData.current?.price || btcData.current_price;
        
        if (!btcData.historical || btcData.historical.length < 200) {
          throw new Error('Insufficient historical data for 200D MA calculation');
        }

        // Calculate MAs using cached data
        const prices = btcData.historical.map(item => item.price);
        const ma50Value = movingAverageService.calculateSMA(prices, 50);
        const ma200Value = movingAverageService.calculateSMA(prices, 200);
        
        const ma50Deviation = ((currentPrice - ma50Value) / ma50Value * 100);
        const ma200Deviation = ((currentPrice - ma200Value) / ma200Value * 100);
        
        const result = {
          currentPrice,
          ma50: {
            value: Math.round(ma50Value * 100) / 100,
            deviation: Math.round(ma50Deviation * 100) / 100,
            status: this.determineMAStatus(ma50Deviation)
          },
          ma200: {
            value: Math.round(ma200Value * 100) / 100,
            deviation: Math.round(ma200Deviation * 100) / 100,
            regime: currentPrice > ma200Value ? 'Bull' : 'Bear'
          },
          analysis: {
            trendStrength: Math.round(Math.abs(ma50Deviation) * 100) / 100,
            pricePosition: this.getPricePosition(currentPrice, ma50Value, ma200Value),
            signals: {
              goldenCross: ma50Value > ma200Value,
              deathCross: ma50Value < ma200Value,
              aboveBoth: currentPrice > ma50Value && currentPrice > ma200Value,
              belowBoth: currentPrice < ma50Value && currentPrice < ma200Value
            }
          },
          metadata: {
            calculatedAt: new Date().toISOString(),
            dataPoints: prices.length,
            source: 'background_job',
            fresh: true,
            jobType: 'scheduled_cache_update'
          }
        };

        // Cache with 1-hour TTL
        const hourPeriod = Math.floor(Date.now() / (60 * 60 * 1000));
        const cacheKey = `market:moving_averages:btc_${hourPeriod}`;
        
        await cacheService.setMovingAverages(cacheKey, result);
        await cacheService.setFallbackData(cacheKey, result, 'moving_averages');
        
        console.log('✅ [Background] Moving Averages cache updated successfully');
        return result;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('moving-averages', job);
  }

  /**
   * Tier 2: Leverage State (Every 3 hours at minute 0)
   */
  scheduleLeverageStateJob() {
    const job = cron.schedule('0 */3 * * *', async () => {
      await this.executeWithErrorHandling('leverage-state', async () => {
        console.log('🔄 [Background] Updating Leverage State cache...');
        // Placeholder for leverage state calculation
        // This would integrate with leverage data providers
        const result = {
          leverageRatio: 2.3,
          trend: 'increasing',
          riskLevel: 'moderate',
          metadata: {
            calculatedAt: new Date().toISOString(),
            source: 'background_job',
            fresh: true,
            nextUpdate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
          }
        };
        
        const cacheKey = 'market:leverage_state:current';
        await cacheService.setWithTTL(cacheKey, result, 3 * 60 * 60); // 3 hours
        
        console.log('✅ [Background] Leverage State cache updated');
        return result;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('leverage-state', job);
  }

  /**
   * Tier 2: Futures Basis (Every 5 hours at minute 15)
   */
  scheduleFuturesBasisJob() {
    const job = cron.schedule('15 */5 * * *', async () => {
      await this.executeWithErrorHandling('futures-basis', async () => {
        console.log('🔄 [Background] Updating Futures Basis cache...');
        // Placeholder for futures basis calculation
        const result = {
          basisPoints: 45,
          regime: 'contango',
          strength: 'moderate',
          metadata: {
            calculatedAt: new Date().toISOString(),
            source: 'background_job',
            fresh: true,
            nextUpdate: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
          }
        };
        
        const cacheKey = 'market:futures_basis:current';
        await cacheService.setWithTTL(cacheKey, result, 5 * 60 * 60); // 5 hours
        
        console.log('✅ [Background] Futures Basis cache updated');
        return result;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('futures-basis', job);
  }

  /**
   * Tier 3: Rotation Breadth (Every 10 hours at minute 30)
   */
  scheduleRotationBreadthJob() {
    const job = cron.schedule('30 */10 * * *', async () => {
      await this.executeWithErrorHandling('rotation-breadth', async () => {
        console.log('🔄 [Background] Updating Rotation Breadth cache...');
        // Placeholder for rotation breadth calculation
        const result = {
          breadthScore: 67,
          direction: 'expanding',
          sectors: ['tech', 'finance'],
          metadata: {
            calculatedAt: new Date().toISOString(),
            source: 'background_job',
            fresh: true,
            nextUpdate: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString()
          }
        };
        
        const cacheKey = 'market:rotation_breadth:current';
        await cacheService.setWithTTL(cacheKey, result, 10 * 60 * 60); // 10 hours
        
        console.log('✅ [Background] Rotation Breadth cache updated');
        return result;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('rotation-breadth', job);
  }

  /**
   * Tier 3: Liquidity Pulse (Every 20 hours at minute 45)
   */
  scheduleLiquidityPulseJob() {
    const job = cron.schedule('45 */20 * * *', async () => {
      await this.executeWithErrorHandling('liquidity-pulse', async () => {
        console.log('🔄 [Background] Updating Liquidity Pulse cache...');
        // Placeholder for liquidity pulse calculation
        const result = {
          liquidityIndex: 78,
          trend: 'stable',
          riskLevel: 'low',
          metadata: {
            calculatedAt: new Date().toISOString(),
            source: 'background_job',
            fresh: true,
            nextUpdate: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()
          }
        };
        
        const cacheKey = 'market:liquidity_pulse:current';
        await cacheService.setWithTTL(cacheKey, result, 20 * 60 * 60); // 20 hours
        
        console.log('✅ [Background] Liquidity Pulse cache updated');
        return result;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('liquidity-pulse', job);
  }

  /**
   * Tier 4: ETF Flows (Every day at 02:00 UTC)
   */
  scheduleETFFlowsJob() {
    const job = cron.schedule('0 2 * * *', async () => {
      await this.executeWithErrorHandling('etf-flows', async () => {
        console.log('🔄 [Background] Updating ETF Flows cache...');
        // Placeholder for ETF flows calculation
        const result = {
          netFlow: 1250000000, // $1.25B
          trend: 'inflow',
          topETFs: ['SPY', 'QQQ', 'IWM'],
          metadata: {
            calculatedAt: new Date().toISOString(),
            source: 'background_job',
            fresh: true,
            nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        };
        
        const cacheKey = 'market:etf_flows:current';
        await cacheService.setWithTTL(cacheKey, result, 4 * 24 * 60 * 60); // 4 days
        
        console.log('✅ [Background] ETF Flows cache updated');
        return result;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('etf-flows', job);
  }

  /**
   * Health monitoring job (Every 30 minutes)
   */
  scheduleHealthMonitorJob() {
    const job = cron.schedule('*/30 * * * *', async () => {
      await this.executeWithErrorHandling('health-monitor', async () => {
        const health = await cacheService.getEnhancedHealth();
        
        console.log('📊 [Health] Cache system status:', {
          hitRate: health.cache.metrics.hitRate,
          totalEntries: health.goldenDataset.totalEntries,
          errors: this.stats.errors
        });
        
        // Alert if hit rate is below target
        if (health.cache.metrics.hitRate < '95%') {
          console.log('⚠️ [Health] Cache hit rate below target (95%)');
        }
        
        return health;
      });
    }, {
      scheduled: false,
      timezone: "UTC"
    });

    this.jobs.set('health-monitor', job);
  }

  /**
   * Execute job with error handling and stats tracking
   */
  async executeWithErrorHandling(jobName, jobFunction) {
    const startTime = Date.now();
    try {
      const result = await jobFunction();
      this.stats.jobsExecuted++;
      this.stats.lastExecution = new Date().toISOString();
      
      const duration = Date.now() - startTime;
      console.log(`✅ [${jobName}] Job completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ [${jobName}] Job failed:`, error.message);
      
      // Don't crash the scheduler, just log and continue
      return null;
    }
  }

  /**
   * Start all scheduled jobs
   */
  startAll() {
    for (const [name, job] of this.jobs) {
      job.start();
      console.log(`🟢 Started ${name} background job`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`🔴 Stopped ${name} background job`);
    }
    this.isRunning = false;
    console.log('🛑 All background jobs stopped');
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeJobs: this.jobs.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Print the job schedule
   */
  printSchedule() {
    console.log('📅 Background Job Schedule:');
    console.log('  Moving Averages: Every hour (Tier 1 - High volatility)');
    console.log('  Leverage State: Every 3 hours (Tier 2 - Medium volatility)');
    console.log('  Futures Basis: Every 5 hours (Tier 2 - Medium volatility)');
    console.log('  Rotation Breadth: Every 10 hours (Tier 3 - Low volatility)');
    console.log('  Liquidity Pulse: Every 20 hours (Tier 3 - Low volatility)');
    console.log('  ETF Flows: Every day (Tier 4 - Daily refresh)');
    console.log('  Health Monitor: Every 30 minutes');
  }

  // Helper methods
  determineMAStatus(deviation) {
    if (deviation > 5) return 'Overbought';
    if (deviation < -5) return 'Oversold';
    if (deviation > 2) return 'High';
    if (deviation < -2) return 'Low';
    return 'Normal';
  }

  getPricePosition(currentPrice, ma50, ma200) {
    if (currentPrice > ma50 && currentPrice > ma200) return 'Above both MAs';
    if (currentPrice < ma50 && currentPrice < ma200) return 'Below both MAs';
    if (currentPrice > ma200 && currentPrice < ma50) return 'Between MAs (below 50D)';
    if (currentPrice < ma200 && currentPrice > ma50) return 'Between MAs (above 50D)';
    return 'At MA levels';
  }
}

// Singleton instance
const backgroundJobScheduler = new BackgroundJobScheduler();

module.exports = backgroundJobScheduler;