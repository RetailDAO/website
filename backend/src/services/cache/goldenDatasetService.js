const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/environment');

/**
 * Golden Dataset Service - Manages persistent cache of "last known good" data
 * This ensures that mock data is always based on real, recent market data
 * rather than purely algorithmic generation.
 */
class GoldenDatasetService {
  constructor() {
    // Use data directory for persistence
    this.dataDir = path.join(__dirname, '../../../data');
    this.goldenFile = path.join(this.dataDir, 'golden_dataset.json');
    this.backupFile = path.join(this.dataDir, 'golden_dataset_backup.json');
    
    // Cache tiers for golden dataset with extended TTL for persistence
    this.goldenTiers = {
      fresh: 5 * 60,        // 5 minutes - very fresh data
      stale: 60 * 60,       // 1 hour - somewhat fresh data  
      archived: 24 * 60 * 60, // 24 hours - old but still valuable
      fallback: 7 * 24 * 60 * 60 // 7 days - emergency fallback
    };

    // Initialize on construction
    this.initialize();
  }

  async initialize() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('📊 Golden Dataset Service initialized');
      
      // Load existing golden dataset on startup
      const dataset = await this.load();
      if (dataset && Object.keys(dataset).length > 0) {
        console.log(`✅ Loaded golden dataset with ${Object.keys(dataset).length} entries`);
        this.logDatasetSummary(dataset);
      } else {
        console.log('🔍 No existing golden dataset found - will create on first API success');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Golden Dataset Service:', error.message);
    }
  }

  /**
   * Store successful API response as golden data
   */
  async store(dataType, data, tier = 'fresh') {
    try {
      const dataset = await this.load() || {};
      const timestamp = new Date().toISOString();
      
      // Create entry with metadata
      dataset[dataType] = {
        data: data,
        timestamp: timestamp,
        tier: tier,
        expiresAt: new Date(Date.now() + this.goldenTiers[tier] * 1000).toISOString(),
        source: 'api_success',
        dataPoints: this.countDataPoints(data)
      };

      await this.save(dataset);
      console.log(`🥇 Stored golden dataset: ${dataType} (${dataset[dataType].dataPoints} points, ${tier} tier)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to store golden dataset for ${dataType}:`, error.message);
      return false;
    }
  }

  /**
   * Retrieve golden data for a specific type with tier preference
   */
  async retrieve(dataType, preferredTiers = ['fresh', 'stale', 'archived']) {
    try {
      const dataset = await this.load();
      if (!dataset || !dataset[dataType]) {
        return null;
      }

      const entry = dataset[dataType];
      const now = new Date();
      const expiresAt = new Date(entry.expiresAt);
      
      // Check if data has expired beyond fallback tier
      if (now > expiresAt && entry.tier !== 'fallback') {
        // Demote to next tier or remove if too old
        const currentTierIndex = Object.keys(this.goldenTiers).indexOf(entry.tier);
        const nextTierKey = Object.keys(this.goldenTiers)[currentTierIndex + 1];
        
        if (nextTierKey) {
          // Demote to next tier
          entry.tier = nextTierKey;
          entry.expiresAt = new Date(Date.now() + this.goldenTiers[nextTierKey] * 1000).toISOString();
          await this.save(dataset);
          console.log(`⬇️ Demoted ${dataType} to ${nextTierKey} tier`);
        } else {
          // Too old, remove
          delete dataset[dataType];
          await this.save(dataset);
          console.log(`🗑️ Removed expired ${dataType} from golden dataset`);
          return null;
        }
      }

      // Check if current tier is acceptable
      if (preferredTiers.includes(entry.tier)) {
        console.log(`🥇 Retrieved golden dataset: ${dataType} (${entry.tier} tier, ${entry.dataPoints} points)`);
        return {
          data: entry.data,
          metadata: {
            tier: entry.tier,
            timestamp: entry.timestamp,
            age: Math.round((now - new Date(entry.timestamp)) / 1000 / 60), // minutes
            source: entry.source,
            dataPoints: entry.dataPoints
          }
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to retrieve golden dataset for ${dataType}:`, error.message);
      return null;
    }
  }

  /**
   * Get all available golden data with their tiers
   */
  async getAll() {
    try {
      const dataset = await this.load();
      if (!dataset) return {};

      const result = {};
      const now = new Date();

      for (const [dataType, entry] of Object.entries(dataset)) {
        const age = Math.round((now - new Date(entry.timestamp)) / 1000 / 60);
        result[dataType] = {
          tier: entry.tier,
          age: age,
          dataPoints: entry.dataPoints,
          timestamp: entry.timestamp,
          available: new Date(entry.expiresAt) > now
        };
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to get all golden datasets:', error.message);
      return {};
    }
  }

  /**
   * Clean expired entries and optimize storage
   */
  async cleanup() {
    try {
      const dataset = await this.load();
      if (!dataset) return 0;

      const now = new Date();
      let removedCount = 0;
      let demotedCount = 0;

      for (const [dataType, entry] of Object.entries(dataset)) {
        const expiresAt = new Date(entry.expiresAt);
        
        if (now > expiresAt) {
          if (entry.tier === 'fallback') {
            // Remove fallback tier entries that have expired
            delete dataset[dataType];
            removedCount++;
          } else {
            // Demote to next tier
            const currentTierIndex = Object.keys(this.goldenTiers).indexOf(entry.tier);
            const nextTierKey = Object.keys(this.goldenTiers)[currentTierIndex + 1];
            
            if (nextTierKey) {
              entry.tier = nextTierKey;
              entry.expiresAt = new Date(Date.now() + this.goldenTiers[nextTierKey] * 1000).toISOString();
              demotedCount++;
            } else {
              delete dataset[dataType];
              removedCount++;
            }
          }
        }
      }

      if (removedCount > 0 || demotedCount > 0) {
        await this.save(dataset);
        console.log(`🧹 Cleaned golden dataset: ${removedCount} removed, ${demotedCount} demoted`);
      }

      return removedCount + demotedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup golden dataset:', error.message);
      return 0;
    }
  }

  /**
   * Get dataset health and statistics
   */
  async getStats() {
    try {
      const dataset = await this.load() || {};
      const now = new Date();
      
      const stats = {
        totalEntries: 0,
        tierBreakdown: { fresh: 0, stale: 0, archived: 0, fallback: 0 },
        totalDataPoints: 0,
        oldestEntry: null,
        newestEntry: null,
        averageAge: 0
      };

      let totalAge = 0;

      for (const [dataType, entry] of Object.entries(dataset)) {
        stats.totalEntries++;
        stats.tierBreakdown[entry.tier]++;
        stats.totalDataPoints += entry.dataPoints || 0;

        const entryDate = new Date(entry.timestamp);
        const age = (now - entryDate) / 1000 / 60; // minutes
        totalAge += age;

        if (!stats.oldestEntry || entryDate < new Date(stats.oldestEntry.timestamp)) {
          stats.oldestEntry = { dataType, ...entry };
        }
        if (!stats.newestEntry || entryDate > new Date(stats.newestEntry.timestamp)) {
          stats.newestEntry = { dataType, ...entry };
        }
      }

      if (stats.totalEntries > 0) {
        stats.averageAge = Math.round(totalAge / stats.totalEntries);
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get golden dataset stats:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Load dataset from file system
   */
  async load() {
    try {
      const data = await fs.readFile(this.goldenFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, return empty dataset
        return {};
      }
      
      // Try backup file
      try {
        console.log('⚠️ Primary golden dataset corrupted, trying backup...');
        const backupData = await fs.readFile(this.backupFile, 'utf8');
        const dataset = JSON.parse(backupData);
        
        // Restore primary from backup
        await this.save(dataset);
        console.log('✅ Restored golden dataset from backup');
        return dataset;
      } catch (backupError) {
        console.error('❌ Both primary and backup golden datasets failed:', error.message);
        return {};
      }
    }
  }

  /**
   * Save dataset to file system with backup
   */
  async save(dataset) {
    try {
      const jsonData = JSON.stringify(dataset, null, 2);
      
      // Create backup of current data before overwriting
      try {
        await fs.copyFile(this.goldenFile, this.backupFile);
      } catch (error) {
        // Backup creation failed, but continue with save
        console.warn('⚠️ Failed to create backup of golden dataset');
      }
      
      // Write new data
      await fs.writeFile(this.goldenFile, jsonData, 'utf8');
      return true;
    } catch (error) {
      console.error('❌ Failed to save golden dataset:', error.message);
      return false;
    }
  }

  /**
   * Count data points in a dataset for metadata
   */
  countDataPoints(data) {
    if (!data) return 0;
    
    let count = 0;
    if (data.historical && Array.isArray(data.historical)) {
      count += data.historical.length;
    }
    if (data.current) {
      count += 1;
    }
    if (data.rsi) {
      Object.values(data.rsi).forEach(periodData => {
        if (Array.isArray(periodData)) count += periodData.length;
      });
    }
    if (data.movingAverages) {
      Object.values(data.movingAverages).forEach(periodData => {
        if (Array.isArray(periodData)) count += periodData.length;
      });
    }
    
    return count;
  }

  /**
   * Log summary of dataset for debugging
   */
  logDatasetSummary(dataset) {
    const entries = Object.entries(dataset);
    console.log('📋 Golden Dataset Summary:');
    entries.forEach(([type, entry]) => {
      const age = Math.round((Date.now() - new Date(entry.timestamp)) / 1000 / 60);
      console.log(`   ${type}: ${entry.tier} tier, ${age}min old, ${entry.dataPoints} points`);
    });
  }

  /**
   * Export dataset for backup or migration
   */
  async export() {
    try {
      const dataset = await this.load();
      const stats = await this.getStats();
      
      return {
        dataset,
        stats,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('❌ Failed to export golden dataset:', error.message);
      return null;
    }
  }

  /**
   * Import dataset from backup or migration
   */
  async import(importData) {
    try {
      if (!importData.dataset) {
        throw new Error('Invalid import data format');
      }

      await this.save(importData.dataset);
      console.log(`✅ Imported golden dataset with ${Object.keys(importData.dataset).length} entries`);
      return true;
    } catch (error) {
      console.error('❌ Failed to import golden dataset:', error.message);
      return false;
    }
  }
}

module.exports = new GoldenDatasetService();