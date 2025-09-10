/**
 * Ultra-Conservative Monitoring Service
 * 
 * Comprehensive monitoring for Market Overview v2 ultra-conservative caching strategy
 * Features:
 * - Cache hit rate tracking and analytics
 * - API call reduction monitoring
 * - Performance metrics collection
 * - Circuit breaker and rate limiting status
 * - Real-time dashboard metrics
 */

const cacheService = require('../cache/cacheService');
const rateLimitedApiService = require('../rateLimitedApi');
const circuitBreaker = require('../circuitBreaker');
const websocketService = require('../websocket/websocketService');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: new Map(),          // Track requests per endpoint
      cacheHits: new Map(),         // Track cache hits per data type  
      cacheMisses: new Map(),       // Track cache misses per data type
      responseTime: new Map(),      // Track response times per endpoint
      errors: new Map(),            // Track errors per service
      apiCalls: new Map(),          // Track actual API calls made
      startTime: Date.now()
    };

    // Performance targets for ultra-conservative strategy
    this.targets = {
      cacheHitRate: 95,             // Target >95% cache hit rate
      apiReduction: 98.1,           // Target 98.1% API call reduction
      responseTime: 2000,           // Target <2s response time
      uptime: 99.9,                 // Target 99.9% uptime
      concurrentUsers: 20           // Target 20+ concurrent users
    };

    // Start periodic monitoring
    this.startPeriodicMonitoring();
  }

  // Track Market Overview request
  trackRequest(endpoint, responseTime, cacheHit = false, dataSource = 'unknown') {
    const now = Date.now();
    
    // Track request count
    const requestCount = this.metrics.requests.get(endpoint) || 0;
    this.metrics.requests.set(endpoint, requestCount + 1);
    
    // Track response time
    const responseTimes = this.metrics.responseTime.get(endpoint) || [];
    responseTimes.push(responseTime);
    if (responseTimes.length > 100) responseTimes.shift(); // Keep last 100
    this.metrics.responseTime.set(endpoint, responseTimes);
    
    // Track cache performance
    if (cacheHit) {
      const hits = this.metrics.cacheHits.get(endpoint) || 0;
      this.metrics.cacheHits.set(endpoint, hits + 1);
    } else {
      const misses = this.metrics.cacheMisses.get(endpoint) || 0;
      this.metrics.cacheMisses.set(endpoint, misses + 1);
    }

    // Track actual API calls (when not cache hit)
    if (!cacheHit && dataSource !== 'websocket' && dataSource !== 'fallback') {
      const calls = this.metrics.apiCalls.get(endpoint) || 0;
      this.metrics.apiCalls.set(endpoint, calls + 1);
    }

    console.log(`📊 [Monitor] ${endpoint}: ${responseTime}ms (${cacheHit ? 'cache' : 'miss'}) [${dataSource}]`);
  }

  // Track individual indicator performance
  trackIndicator(indicatorName, responseTime, fresh, source) {
    const key = `indicator_${indicatorName}`;
    this.trackRequest(key, responseTime, fresh, source);
  }

  // Track error occurrence
  trackError(service, error, endpoint = null) {
    const errorKey = endpoint ? `${service}_${endpoint}` : service;
    const errors = this.metrics.errors.get(errorKey) || [];
    errors.push({
      error: error.message,
      timestamp: Date.now(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    });
    
    // Keep last 50 errors
    if (errors.length > 50) errors.shift();
    this.metrics.errors.set(errorKey, errors);
    
    console.error(`🚨 [Monitor] Error in ${service}:`, error.message);
  }

  // Get comprehensive cache hit rate analytics
  getCacheAnalytics() {
    const analytics = {};
    
    // Calculate hit rates per endpoint
    this.metrics.cacheHits.forEach((hits, endpoint) => {
      const misses = this.metrics.cacheMisses.get(endpoint) || 0;
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total * 100) : 0;
      
      analytics[endpoint] = {
        hits,
        misses,
        total,
        hitRate: Math.round(hitRate * 100) / 100,
        performance: hitRate >= this.targets.cacheHitRate ? 'excellent' : 
                    hitRate >= 85 ? 'good' : 
                    hitRate >= 70 ? 'degraded' : 'poor'
      };
    });

    // Calculate overall hit rate
    const totalHits = Array.from(this.metrics.cacheHits.values()).reduce((sum, hits) => sum + hits, 0);
    const totalMisses = Array.from(this.metrics.cacheMisses.values()).reduce((sum, misses) => sum + misses, 0);
    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests * 100) : 0;

    return {
      overall: {
        hitRate: Math.round(overallHitRate * 100) / 100,
        totalHits,
        totalMisses,
        totalRequests,
        target: this.targets.cacheHitRate,
        status: overallHitRate >= this.targets.cacheHitRate ? 'meeting_target' : 'below_target'
      },
      endpoints: analytics,
      timestamp: new Date().toISOString()
    };
  }

  // Calculate API call reduction metrics
  getAPIReductionMetrics() {
    const totalAPICallsMade = Array.from(this.metrics.apiCalls.values()).reduce((sum, calls) => sum + calls, 0);
    const totalRequests = Array.from(this.metrics.requests.values()).reduce((sum, reqs) => sum + reqs, 0);
    
    // Estimate what API calls would have been without caching
    const estimatedNormalCalls = totalRequests; // 1 API call per request without caching
    const actualReduction = totalRequests > 0 ? ((estimatedNormalCalls - totalAPICallsMade) / estimatedNormalCalls * 100) : 0;

    return {
      actualReduction: Math.round(actualReduction * 100) / 100,
      target: this.targets.apiReduction,
      estimatedNormalCalls,
      actualAPICalls: totalAPICallsMade,
      callsSaved: estimatedNormalCalls - totalAPICallsMade,
      status: actualReduction >= this.targets.apiReduction ? 'meeting_target' : 'below_target',
      monthlySavings: this.calculateMonthlySavings(estimatedNormalCalls, totalAPICallsMade)
    };
  }

  // Calculate estimated monthly API savings
  calculateMonthlySavings(estimated, actual) {
    const uptime = Date.now() - this.metrics.startTime;
    const hourlyEstimated = (estimated / uptime) * (60 * 60 * 1000);
    const hourlyActual = (actual / uptime) * (60 * 60 * 1000);
    
    const monthlyEstimated = hourlyEstimated * 24 * 30;
    const monthlyActual = hourlyActual * 24 * 30;
    const monthlySaved = monthlyEstimated - monthlyActual;

    return {
      estimated: Math.round(monthlyEstimated),
      actual: Math.round(monthlyActual),
      saved: Math.round(monthlySaved),
      reduction: Math.round((monthlySaved / monthlyEstimated) * 100 * 100) / 100
    };
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const performanceData = {};
    
    this.metrics.responseTime.forEach((times, endpoint) => {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      // Calculate percentiles
      const sorted = [...times].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      performanceData[endpoint] = {
        average: Math.round(avg),
        min,
        max,
        p50,
        p95,
        p99,
        samples: times.length,
        target: this.targets.responseTime,
        status: avg <= this.targets.responseTime ? 'meeting_target' : 'below_target'
      };
    });

    return performanceData;
  }

  // Get comprehensive monitoring dashboard
  getMonitoringDashboard() {
    const cacheAnalytics = this.getCacheAnalytics();
    const apiReduction = this.getAPIReductionMetrics();
    const performance = this.getPerformanceMetrics();
    const cacheHealth = cacheService.getUltraConservativeMetrics();
    const protectionStatus = rateLimitedApiService.getProtectionStatus();
    const websocketStatus = websocketService.getConnectionStatus();

    // Calculate overall system health
    const systemHealth = this.calculateSystemHealth(cacheAnalytics, apiReduction, performance);

    return {
      strategy: 'ultra_conservative_market_overview_v2',
      systemHealth,
      performance: {
        cache: cacheAnalytics,
        apiReduction,
        responseTime: performance,
        targets: this.targets
      },
      infrastructure: {
        cache: cacheHealth,
        protection: protectionStatus,
        websocket: websocketStatus
      },
      uptime: {
        seconds: Math.round((Date.now() - this.metrics.startTime) / 1000),
        started: new Date(this.metrics.startTime).toISOString()
      },
      errors: this.getErrorSummary(),
      timestamp: new Date().toISOString()
    };
  }

  // Calculate overall system health score
  calculateSystemHealth(cacheAnalytics, apiReduction, performance) {
    let healthScore = 0;
    let totalChecks = 0;

    // Cache hit rate health (40% weight)
    if (cacheAnalytics.overall.hitRate >= this.targets.cacheHitRate) healthScore += 40;
    else if (cacheAnalytics.overall.hitRate >= 85) healthScore += 30;
    else if (cacheAnalytics.overall.hitRate >= 70) healthScore += 20;
    totalChecks += 40;

    // API reduction health (30% weight)
    if (apiReduction.actualReduction >= this.targets.apiReduction) healthScore += 30;
    else if (apiReduction.actualReduction >= 90) healthScore += 20;
    else if (apiReduction.actualReduction >= 80) healthScore += 10;
    totalChecks += 30;

    // Performance health (30% weight)
    const avgResponseTimes = Object.values(performance);
    if (avgResponseTimes.length > 0) {
      const overallAvg = avgResponseTimes.reduce((sum, p) => sum + p.average, 0) / avgResponseTimes.length;
      if (overallAvg <= this.targets.responseTime) healthScore += 30;
      else if (overallAvg <= this.targets.responseTime * 1.5) healthScore += 20;
      else if (overallAvg <= this.targets.responseTime * 2) healthScore += 10;
    }
    totalChecks += 30;

    const finalScore = Math.round((healthScore / totalChecks) * 100);
    
    let status = 'excellent';
    if (finalScore < 60) status = 'critical';
    else if (finalScore < 75) status = 'degraded';
    else if (finalScore < 90) status = 'good';

    return {
      score: finalScore,
      status,
      cachePerformance: cacheAnalytics.overall.hitRate >= this.targets.cacheHitRate,
      apiReductionTarget: apiReduction.actualReduction >= this.targets.apiReduction,
      responseTimeTarget: avgResponseTimes.length > 0 && avgResponseTimes[0]?.average <= this.targets.responseTime
    };
  }

  // Get error summary
  getErrorSummary() {
    const summary = {};
    this.metrics.errors.forEach((errors, service) => {
      summary[service] = {
        count: errors.length,
        latest: errors.length > 0 ? errors[errors.length - 1] : null,
        frequency: this.calculateErrorFrequency(errors)
      };
    });
    return summary;
  }

  // Calculate error frequency
  calculateErrorFrequency(errors) {
    if (errors.length === 0) return 0;
    
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const recentErrors = errors.filter(e => e.timestamp > hourAgo);
    
    return recentErrors.length; // Errors per hour
  }

  // Start periodic monitoring and cleanup
  startPeriodicMonitoring() {
    // Log monitoring summary every 5 minutes
    setInterval(() => {
      const cacheAnalytics = this.getCacheAnalytics();
      const apiReduction = this.getAPIReductionMetrics();
      
      console.log('📊 [Monitor] 5min summary:');
      console.log(`   Cache Hit Rate: ${cacheAnalytics.overall.hitRate}% (target: ${this.targets.cacheHitRate}%)`);
      console.log(`   API Reduction: ${apiReduction.actualReduction}% (target: ${this.targets.apiReduction}%)`);
      console.log(`   Total Requests: ${cacheAnalytics.overall.totalRequests}`);
      console.log(`   API Calls Made: ${apiReduction.actualAPICalls}`);
    }, 5 * 60 * 1000);

    // Clean up old metrics every 30 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 30 * 60 * 1000);
  }

  // Clean up old metric data
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean up old response times (keep last 100)
    this.metrics.responseTime.forEach((times, endpoint) => {
      if (times.length > 100) {
        this.metrics.responseTime.set(endpoint, times.slice(-100));
      }
    });

    // Clean up old errors (keep last 50)
    this.metrics.errors.forEach((errors, service) => {
      const recentErrors = errors.filter(e => e.timestamp > oneHourAgo);
      if (recentErrors.length !== errors.length) {
        this.metrics.errors.set(service, recentErrors.slice(-50));
      }
    });

    console.log('🧹 [Monitor] Cleaned up old metrics');
  }

  // Reset metrics (for testing or maintenance)
  resetMetrics() {
    this.metrics.requests.clear();
    this.metrics.cacheHits.clear();
    this.metrics.cacheMisses.clear();
    this.metrics.responseTime.clear();
    this.metrics.errors.clear();
    this.metrics.apiCalls.clear();
    this.metrics.startTime = Date.now();
    
    console.log('🔄 [Monitor] Metrics reset');
  }
}

// Export singleton instance
module.exports = new MonitoringService();