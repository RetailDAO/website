// Performance monitoring utilities for Market Overview v2
import { useEffect } from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

// Performance thresholds based on our targets
const PERFORMANCE_THRESHOLDS = {
  FCP: 1800, // First Contentful Paint - Good: <1.8s
  LCP: 2500, // Largest Contentful Paint - Good: <2.5s
  INP: 200,  // Interaction to Next Paint - Good: <200ms
  CLS: 0.1,  // Cumulative Layout Shift - Good: <0.1
  TTFB: 600, // Time to First Byte - Good: <600ms
  TBT: 200   // Total Blocking Time - Our target: <200ms
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  console.log('🚀 Performance monitoring initialized for Market Overview v2');
  
  // Monitor all Core Web Vitals
  onCLS(onPerfEntry);
  onINP(onPerfEntry); // INP replaced FID in Web Vitals v5
  onFCP(onPerfEntry);
  onLCP(onPerfEntry);
  onTTFB(onPerfEntry);
  
  // Monitor custom metrics
  monitorComponentRenderTimes();
  monitorBundleSize();
  monitorAPIPerformance();
  
  // Log initial performance budget
  console.log('📊 Performance Targets:', PERFORMANCE_THRESHOLDS);
};

// Handle performance entries
const onPerfEntry = ({ name, delta, value, id, rating }) => {
  const threshold = PERFORMANCE_THRESHOLDS[name.toUpperCase()];
  const status = getPerformanceStatus(value, threshold, name);
  
  console.log(`📈 ${name}: ${Math.round(value)}ms (${rating}) ${status}`);
  
  // Send to analytics in production
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? delta * 1000 : delta),
      custom_map: { metric_rating: rating }
    });
  }
  
  // Store metrics for debugging
  if (!window.__PERF_METRICS__) {
    window.__PERF_METRICS__ = {};
  }
  window.__PERF_METRICS__[name] = { value, delta, rating, timestamp: Date.now() };
};

// Get performance status with visual indicators
const getPerformanceStatus = (value, threshold, metricName) => {
  if (!threshold) return '';
  
  const percentage = (value / threshold) * 100;
  
  if (percentage <= 75) return '🟢 Excellent';
  if (percentage <= 100) return '🟡 Good';
  if (percentage <= 150) return '🟠 Needs Improvement';
  return '🔴 Poor';
};

// Monitor component render times
const monitorComponentRenderTimes = () => {
  if (!window.PerformanceObserver) return;
  
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure' && entry.name.includes('MarketOverview')) {
        const renderTime = Math.round(entry.duration);
        console.log(`⚡ Component: ${entry.name} rendered in ${renderTime}ms`);
        
        // Alert if component exceeds render budget
        if (renderTime > 100) {
          console.warn(`⚠️ Performance Budget Exceeded: ${entry.name} took ${renderTime}ms (budget: 100ms)`);
        }
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure'] });
};

// Monitor bundle size and loading performance
const monitorBundleSize = () => {
  if (!navigator.connection) return;
  
  const connection = navigator.connection;
  console.log(`🌐 Network: ${connection.effectiveType} (${connection.downlink}Mbps)`);
  
  // Estimate bundle load time based on network
  const estimatedBundleSize = 350 * 1024; // Our target: 350KB
  const estimatedLoadTime = (estimatedBundleSize * 8) / (connection.downlink * 1024 * 1024);
  
  console.log(`📦 Estimated bundle load time: ${Math.round(estimatedLoadTime * 1000)}ms`);
  
  if (estimatedLoadTime > 2) {
    console.warn('⚠️ Bundle may be too large for slower connections');
  }
};

// Monitor API performance
const monitorAPIPerformance = () => {
  // Wrap fetch to monitor API calls
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url] = args;
    const startTime = performance.now();
    
    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Log API performance
      if (url.includes('/api/') || url.includes('coingecko') || url.includes('fred')) {
        console.log(`🔌 API: ${url.split('/').pop()} - ${duration}ms`);
        
        // Alert on slow API calls
        if (duration > 2000) {
          console.warn(`⚠️ Slow API call: ${url} took ${duration}ms`);
        }
      }
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      console.error(`❌ API Error: ${url} failed after ${duration}ms`, error.message);
      throw error;
    }
  };
};

// Performance tracking hook for components
export const usePerformanceTracking = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();
    performance.mark(`${componentName}-start`);
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      performance.mark(`${componentName}-end`);
      performance.measure(`${componentName}-lifecycle`, `${componentName}-start`, `${componentName}-end`);
      
      // Log component performance
      console.log(`🧩 Component: ${componentName} lifecycle - ${Math.round(duration)}ms`);
      
      // Track in global metrics
      if (!window.__COMPONENT_PERF__) {
        window.__COMPONENT_PERF__ = {};
      }
      window.__COMPONENT_PERF__[componentName] = {
        duration: Math.round(duration),
        timestamp: Date.now()
      };
    };
  }, [componentName]);
};

// Get current performance summary
export const getPerformanceSummary = () => {
  const metrics = window.__PERF_METRICS__ || {};
  const components = window.__COMPONENT_PERF__ || {};
  
  return {
    webVitals: metrics,
    components,
    timestamp: Date.now(),
    meetsTargets: {
      FCP: metrics.FCP?.value < PERFORMANCE_THRESHOLDS.FCP,
      LCP: metrics.LCP?.value < PERFORMANCE_THRESHOLDS.LCP,
      CLS: metrics.CLS?.value < PERFORMANCE_THRESHOLDS.CLS,
      overall: Object.values(metrics).every(metric => 
        metric.rating === 'good' || metric.rating === 'needs-improvement'
      )
    }
  };
};

// Bundle analyzer helper
export const analyzeBundleSize = async () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Bundle analysis available at: http://localhost:8888');
    console.log('Run: npm run build && npm run analyze');
  }
};

export default {
  initPerformanceMonitoring,
  usePerformanceTracking,
  getPerformanceSummary,
  analyzeBundleSize,
  PERFORMANCE_THRESHOLDS
};