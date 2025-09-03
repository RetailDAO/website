/**
 * Intelligent Tiered Cache Service for Sub-3-Second Load Times
 * 
 * This service implements a sophisticated caching strategy that ensures the UI
 * loads in under 3 seconds by serving data in tiered priority:
 * 
 * Tier 1: Golden Dataset (Instant - 0ms)
 * Tier 2: Cached Real Data (Fast - <500ms) 
 * Tier 3: Fresh API Data (Progressive - background)
 * 
 * Features:
 * - Instant UI rendering with high-quality mock data
 * - Progressive enhancement with real cached data
 * - Background refresh with fresh API data
 * - Intelligent data quality scoring
 * - Automatic fallback mechanisms
 */

import persistentMockService from './persistentMockDataService.js';
import apiService from './api.js';

class IntelligentCacheService {
  constructor() {
    this.STORAGE_KEYS = {
      GOLDEN_DATASET: 'retaildao_golden_dataset',
      CACHE_QUALITY: 'retaildao_cache_quality',
      LAST_FRESH_UPDATE: 'retaildao_last_fresh_update'
    };
    
    // Data quality thresholds (minutes)
    this.QUALITY_THRESHOLDS = {
      EXCELLENT: 5,    // Data less than 5 minutes old
      GOOD: 30,        // Data less than 30 minutes old  
      ACCEPTABLE: 120, // Data less than 2 hours old
      STALE: 1440      // Data less than 24 hours old
    };
    
    // Performance targets (milliseconds)
    this.PERFORMANCE_TARGETS = {
      TIER1_TARGET: 100,   // Golden dataset should load in <100ms
      TIER2_TARGET: 500,   // Cached data should load in <500ms
      TIER3_TARGET: 3000   // Fresh data should complete in <3s
    };
    
    this.loadingState = {
      tier1Complete: false,
      tier2Complete: false,
      tier3Complete: false,
      startTime: null
    };
  }

  /**
   * Main method: Get market data with intelligent tiered loading
   * Returns data immediately from best available source, then progressively enhances
   */
  async getMarketDataIntelligent(options = {}) {
    const { 
      onTier1Complete = null, 
      onTier2Complete = null, 
      onTier3Complete = null,
      enableProgressiveLoading = true
    } = options;

    this.loadingState.startTime = performance.now();
    
    try {
      // TIER 1: Instant Golden Dataset (Target: <100ms)
      console.log('🚀 TIER 1: Loading Golden Dataset for instant UI...');
      const tier1Start = performance.now();
      
      const goldenData = this.getGoldenDataset();
      const tier1Time = performance.now() - tier1Start;
      
      if (goldenData) {
        console.log(`✅ TIER 1 Complete: ${tier1Time.toFixed(1)}ms - Golden dataset loaded`);
        this.loadingState.tier1Complete = true;
        
        if (onTier1Complete) {
          onTier1Complete(goldenData, { tier: 1, loadTime: tier1Time, quality: 'golden' });
        }
        
        // Start Tier 2 and 3 in parallel if progressive loading enabled
        if (enableProgressiveLoading) {
          this.startTier2Loading(onTier2Complete);
          this.startTier3Loading(onTier3Complete);
        }
        
        return goldenData;
      }
    } catch (error) {
      console.warn('⚠️ TIER 1 Failed:', error.message);
    }

    // TIER 1 FALLBACK: If no golden dataset, use persistent mock
    console.log('🎭 TIER 1 FALLBACK: Using persistent mock data...');
    try {
      const fallbackStart = performance.now();
      const fallbackData = await persistentMockService.getAllMarketData();
      const fallbackTime = performance.now() - fallbackStart;
      
      console.log(`✅ TIER 1 FALLBACK Complete: ${fallbackTime.toFixed(1)}ms`);
      this.loadingState.tier1Complete = true;
      
      if (onTier1Complete) {
        onTier1Complete(fallbackData, { tier: 1, loadTime: fallbackTime, quality: 'mock' });
      }
      
      if (enableProgressiveLoading) {
        this.startTier2Loading(onTier2Complete);
        this.startTier3Loading(onTier3Complete);
      }
      
      return fallbackData;
    } catch (fallbackError) {
      console.error('❌ TIER 1 CRITICAL FAILURE:', fallbackError.message);
      throw new Error('Failed to load any initial data');
    }
  }

  /**
   * TIER 2: Enhanced cached data loading (Target: <500ms)
   */
  async startTier2Loading(onComplete) {
    setTimeout(async () => {
      try {
        console.log('🔄 TIER 2: Loading enhanced cached data...');
        const tier2Start = performance.now();
        
        const cachedData = await this.getCachedRealData();
        const tier2Time = performance.now() - tier2Start;
        
        if (cachedData) {
          console.log(`✅ TIER 2 Complete: ${tier2Time.toFixed(1)}ms - Cached real data loaded`);
          this.loadingState.tier2Complete = true;
          
          if (onComplete) {
            const quality = this.assessDataQuality(cachedData);
            onComplete(cachedData, { tier: 2, loadTime: tier2Time, quality });
          }
        }
      } catch (error) {
        console.warn('⚠️ TIER 2 Failed:', error.message);
      }
    }, 50); // Small delay to ensure Tier 1 renders first
  }

  /**
   * TIER 3: Fresh API data loading (Target: <3000ms)
   */
  async startTier3Loading(onComplete) {
    setTimeout(async () => {
      try {
        console.log('📡 TIER 3: Loading fresh API data...');
        const tier3Start = performance.now();
        
        const freshData = await apiService.getAllMarketDataWithAnalysis();
        const tier3Time = performance.now() - tier3Start;
        
        if (freshData?.success) {
          console.log(`✅ TIER 3 Complete: ${tier3Time.toFixed(1)}ms - Fresh API data loaded`);
          this.loadingState.tier3Complete = true;
          
          // Update golden dataset with fresh data
          this.updateGoldenDataset(freshData.data);
          
          if (onComplete) {
            onComplete(freshData.data, { tier: 3, loadTime: tier3Time, quality: 'fresh' });
          }
        }
      } catch (error) {
        console.warn('⚠️ TIER 3 Failed:', error.message);
      }
    }, 100); // Slight delay to prioritize Tier 1 and 2
  }

  /**
   * Get golden dataset from localStorage
   */
  getGoldenDataset() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.GOLDEN_DATASET);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      const age = Date.now() - new Date(parsed.timestamp).getTime();
      const ageMinutes = age / (1000 * 60);
      
      // Golden dataset is valid for 24 hours
      if (ageMinutes < 1440) {
        console.log(`🥇 Golden dataset found: ${ageMinutes.toFixed(1)}min old`);
        return parsed.data;
      } else {
        console.log(`🗑️ Golden dataset expired: ${ageMinutes.toFixed(1)}min old`);
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load golden dataset:', error.message);
      return null;
    }
  }

  /**
   * Get cached real data with intelligent quality assessment
   */
  async getCachedRealData() {
    try {
      // Try multiple cache sources in parallel for speed
      const cachePromises = [
        apiService.getMultiCryptoAnalysis('BTC,ETH', '220D').catch(() => null),
        apiService.getDXYAnalysis('30D').catch(() => null),
        apiService.getFundingRates().catch(() => null),
        apiService.getETFFlows().catch(() => null)
      ];
      
      const [cryptoCache, dxyCache, fundingCache, etfCache] = await Promise.all(cachePromises);
      
      if (cryptoCache?.success) {
        const enhancedData = await this.combineAndEnhanceCachedData({
          crypto: cryptoCache,
          dxy: dxyCache,
          funding: fundingCache,
          etf: etfCache
        });
        
        return enhancedData;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to get cached real data:', error.message);
      return null;
    }
  }

  /**
   * Combine cached data sources intelligently
   */
  async combineAndEnhanceCachedData(cacheData) {
    try {
      const baseData = await persistentMockService.getAllMarketData();
      
      // Enhance with crypto data if available
      if (cacheData.crypto?.success && cacheData.crypto.data) {
        Object.entries(cacheData.crypto.data).forEach(([symbol, data]) => {
          const cryptoKey = symbol.toLowerCase() === 'btc' ? 'bitcoin' : 
                          symbol.toLowerCase() === 'eth' ? 'ethereum' : symbol.toLowerCase();
          
          if (baseData[cryptoKey] && data?.currentPrice) {
            baseData[cryptoKey] = {
              ...baseData[cryptoKey],
              currentPrice: data.currentPrice,
              priceChange24h: data.priceChange24h,
              priceChangePercent24h: data.priceChangePercent24h,
              historical: data.historical || baseData[cryptoKey].historical,
              prices: data.historical || baseData[cryptoKey].prices, // Legacy support
              rsi: data.rsi || baseData[cryptoKey].rsi,
              source: 'Cached Real Data'
            };
          }
        });
      }
      
      // Enhance with DXY data if available
      if (cacheData.dxy?.success && cacheData.dxy.data) {
        baseData.dxy = cacheData.dxy.data;
        baseData.dxyData = cacheData.dxy.data;
      }
      
      return baseData;
    } catch (error) {
      console.warn('⚠️ Failed to combine cached data:', error.message);
      return null;
    }
  }

  /**
   * Update golden dataset with fresh data
   */
  updateGoldenDataset(freshData) {
    try {
      const goldenDataset = {
        data: freshData,
        timestamp: new Date().toISOString(),
        quality: 'fresh',
        version: '2.0'
      };
      
      localStorage.setItem(this.STORAGE_KEYS.GOLDEN_DATASET, JSON.stringify(goldenDataset));
      localStorage.setItem(this.STORAGE_KEYS.LAST_FRESH_UPDATE, new Date().toISOString());
      
      console.log('🥇 Golden dataset updated with fresh data');
    } catch (error) {
      console.warn('⚠️ Failed to update golden dataset:', error.message);
    }
  }

  /**
   * Assess data quality based on age and completeness
   */
  assessDataQuality(data) {
    try {
      let score = 0;
      let maxScore = 0;
      
      // Check data completeness
      const expectedKeys = ['bitcoin', 'ethereum', 'solana', 'dxy', 'fundingRates'];
      expectedKeys.forEach(key => {
        maxScore += 20;
        if (data[key]) score += 20;
      });
      
      // Check data freshness
      if (data.bitcoin?.source) {
        maxScore += 20;
        if (data.bitcoin.source.includes('API')) score += 20;
        else if (data.bitcoin.source.includes('Cache')) score += 15;
        else if (data.bitcoin.source.includes('Mock')) score += 10;
      }
      
      const qualityPercentage = (score / maxScore) * 100;
      
      if (qualityPercentage >= 90) return 'excellent';
      if (qualityPercentage >= 75) return 'good';
      if (qualityPercentage >= 50) return 'acceptable';
      return 'poor';
      
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get loading performance stats
   */
  getPerformanceStats() {
    const totalTime = this.loadingState.startTime ? 
      performance.now() - this.loadingState.startTime : 0;
      
    return {
      totalLoadTime: totalTime,
      tier1Complete: this.loadingState.tier1Complete,
      tier2Complete: this.loadingState.tier2Complete,  
      tier3Complete: this.loadingState.tier3Complete,
      meetsPerformanceTarget: totalTime < this.PERFORMANCE_TARGETS.TIER3_TARGET
    };
  }

  /**
   * Preload golden dataset in background (call this periodically)
   */
  async preloadGoldenDataset() {
    try {
      console.log('🔄 Preloading golden dataset in background...');
      const freshData = await apiService.getAllMarketDataWithAnalysis();
      
      if (freshData?.success) {
        this.updateGoldenDataset(freshData.data);
        console.log('✅ Golden dataset preloaded successfully');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Golden dataset preload failed:', error.message);
    }
    return false;
  }

  /**
   * Clear all cache data
   */
  clearCache() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🧹 Cache cleared');
  }
}

// Export singleton instance
export default new IntelligentCacheService();