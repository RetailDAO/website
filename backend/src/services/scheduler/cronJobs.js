const cron = require('node-cron');
const { dxyController } = require('../../controllers/dxyController');
const { etfController } = require('../../controllers/etfController');
const cacheService = require('../cache/cacheService');

class CronJobService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all cron jobs
  initializeJobs() {
    if (this.isInitialized) {
      console.log('⚠️ Cron jobs already initialized');
      return;
    }

    try {
      // Daily DXY refresh at 2:00 AM UTC
      this.scheduleJob('dxy-refresh', '0 2 * * *', async () => {
        console.log('🕐 Running daily DXY refresh...');
        try {
          await this.refreshDXYData();
          console.log('✅ DXY data refreshed successfully');
        } catch (error) {
          console.error('❌ DXY refresh failed:', error.message);
        }
      });

      // ETF flows refresh every 3 days at 3:00 AM UTC
      this.scheduleJob('etf-refresh', '0 3 */3 * *', async () => {
        console.log('🕐 Running ETF flows refresh...');
        try {
          await this.refreshETFData();
          console.log('✅ ETF flows refreshed successfully');
        } catch (error) {
          console.error('❌ ETF flows refresh failed:', error.message);
        }
      });

      // Cache maintenance every 6 hours
      this.scheduleJob('cache-maintenance', '0 */6 * * *', async () => {
        console.log('🕐 Running cache maintenance...');
        try {
          await cacheService.performMaintenance();
          console.log('✅ Cache maintenance completed');
        } catch (error) {
          console.error('❌ Cache maintenance failed:', error.message);
        }
      });

      // Golden dataset backup daily at 4:00 AM UTC
      this.scheduleJob('golden-backup', '0 4 * * *', async () => {
        console.log('🕐 Running golden dataset backup...');
        try {
          await this.backupGoldenDataset();
          console.log('✅ Golden dataset backup completed');
        } catch (error) {
          console.error('❌ Golden dataset backup failed:', error.message);
        }
      });

      this.isInitialized = true;
      console.log(`🚀 Initialized ${this.jobs.size} cron jobs`);
      this.listActiveJobs();

    } catch (error) {
      console.error('❌ Failed to initialize cron jobs:', error.message);
    }
  }

  // Schedule a new cron job
  scheduleJob(name, schedule, task) {
    if (this.jobs.has(name)) {
      console.log(`⚠️ Cron job '${name}' already exists, destroying old one`);
      this.jobs.get(name).destroy();
    }

    const job = cron.schedule(schedule, task, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set(name, job);
    console.log(`✅ Scheduled cron job '${name}': ${schedule}`);
    return job;
  }

  // Refresh DXY data
  async refreshDXYData() {
    const mockReq = { query: { timeframe: '30D' } };
    const mockRes = {
      json: (data) => {
        if (data.success) {
          console.log('📈 DXY data refreshed with', data.data?.historical?.length || 0, 'data points');
        }
        return data;
      },
      status: (code) => ({ json: (data) => data })
    };

    return await dxyController.getAnalysis(mockReq, mockRes);
  }

  // Refresh ETF flows data
  async refreshETFData() {
    const mockReq = { query: { dateRange: '90D' } };
    const mockRes = {
      json: (data) => {
        if (data.success) {
          console.log('💰 ETF flows refreshed with', data.data?.flows?.length || 0, 'flow records');
        }
        return data;
      },
      status: (code) => ({ json: (data) => data })
    };

    return await etfController.getFlows(mockReq, mockRes);
  }

  // Backup golden dataset
  async backupGoldenDataset() {
    const goldenDatasetService = require('../cache/goldenDatasetService');
    const stats = await goldenDatasetService.getStats();
    
    if (stats.totalEntries > 0) {
      console.log(`📦 Golden dataset contains ${stats.totalEntries} entries across ${stats.dataTypes} data types`);
      
      // Trigger cleanup of old entries
      const cleanedCount = await goldenDatasetService.cleanup();
      console.log(`🧹 Cleaned up ${cleanedCount} old golden dataset entries`);
    } else {
      console.log('📦 Golden dataset is empty, no backup needed');
    }
  }

  // List all active cron jobs
  listActiveJobs() {
    console.log('📋 Active cron jobs:');
    this.jobs.forEach((job, name) => {
      const status = job.getStatus();
      console.log(`  - ${name}: ${status}`);
    });
  }

  // Stop a specific job
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
      console.log(`⏹️ Stopped cron job: ${name}`);
      return true;
    }
    return false;
  }

  // Stop all jobs
  stopAllJobs() {
    console.log('⏹️ Stopping all cron jobs...');
    this.jobs.forEach((job, name) => {
      job.destroy();
      console.log(`⏹️ Stopped: ${name}`);
    });
    this.jobs.clear();
    this.isInitialized = false;
  }

  // Get job status
  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        status: job.getStatus(),
        scheduled: true
      };
    });
    return {
      totalJobs: this.jobs.size,
      initialized: this.isInitialized,
      jobs: status
    };
  }

  // Manual trigger for testing
  async triggerJob(jobName) {
    switch (jobName) {
      case 'dxy-refresh':
        return await this.refreshDXYData();
      case 'etf-refresh':
        return await this.refreshETFData();
      case 'cache-maintenance':
        return await cacheService.performMaintenance();
      case 'golden-backup':
        return await this.backupGoldenDataset();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

module.exports = new CronJobService();