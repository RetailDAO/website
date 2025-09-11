/**
 * Optimized Futures Basis Hook
 * 
 * Performance-optimized React hook for futures basis data
 * Features:
 * - Intelligent caching with 10-minute stale time
 * - Error handling with graceful degradation
 * - Performance tracking
 * - Automatic retries with exponential backoff
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetch futures basis data from optimized API
 */
const fetchFuturesBasis = async () => {
  const startTime = performance.now();
  
  try {
    console.log('🔍 [useFuturesBasis] Fetching futures basis data...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}/api/v1/market-overview/futures-basis`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    const processingTime = Math.round(performance.now() - startTime);
    
    if (!responseData.success) {
      throw new Error(responseData.message || 'API returned unsuccessful response');
    }

    const data = responseData.data;
    
    console.log(`✅ [useFuturesBasis] Data fetched in ${processingTime}ms - Basis: ${data.annualizedBasis}%, Regime: ${data.regime}`);
    
    // Track performance metrics
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('futures-basis-fetch-complete');
      performance.measure('futures-basis-fetch', 'futures-basis-fetch-start', 'futures-basis-fetch-complete');
    }

    return {
      ...data,
      _metadata: {
        ...data.metadata,
        fetchTime: processingTime
      }
    };

  } catch (error) {
    const processingTime = Math.round(performance.now() - startTime);
    console.error('❌ [useFuturesBasis] Error fetching data:', error.message);
    
    // Re-throw with additional context
    const enhancedError = new Error(`Futures basis fetch failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.fetchTime = processingTime;
    
    throw enhancedError;
  }
};

/**
 * Optimized futures basis hook with intelligent caching
 */
export const useOptimizedFuturesBasis = (options = {}) => {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = false,
    staleTime = 10 * 60 * 1000, // 10 minutes
    cacheTime = 30 * 60 * 1000, // 30 minutes
    retry = 3,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions
  } = options;

  // Mark fetch start for performance tracking
  if (typeof window !== 'undefined' && window.performance && enabled) {
    performance.mark('futures-basis-fetch-start');
  }

  const queryResult = useQuery({
    queryKey: ['market-overview', 'futures-basis'],
    queryFn: fetchFuturesBasis,
    enabled,
    staleTime,
    cacheTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry,
    retryDelay,
    ...queryOptions,
    
    // Enhanced error handling
    onError: (error) => {
      console.error('🚨 [useFuturesBasis] Query error:', error.message);
      
      // Track error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', error);
      }
      
      // Call user's onError if provided
      if (queryOptions.onError) {
        queryOptions.onError(error);
      }
    },
    
    // Success callback for performance tracking
    onSuccess: (data) => {
      if (data && data._metadata) {
        console.log(`📊 [useFuturesBasis] Success - Source: ${data._metadata.dataSource}, Time: ${data._metadata.fetchTime}ms`);
        
        // Track performance metrics for monitoring
        if (typeof window !== 'undefined' && window.performance) {
          performance.mark('futures-basis-success');
          
          // Create performance entry for monitoring
          const perfEntry = {
            name: 'futures-basis-load',
            fetchTime: data._metadata.fetchTime,
            dataSource: data._metadata.dataSource,
            timestamp: Date.now(),
            cacheHit: data._metadata.dataSource === 'cached'
          };
          
          // Store in session for debugging
          if (process.env.NODE_ENV === 'development') {
            const perfLog = JSON.parse(sessionStorage.getItem('futures-perf-log') || '[]');
            perfLog.push(perfEntry);
            if (perfLog.length > 10) perfLog.shift(); // Keep last 10 entries
            sessionStorage.setItem('futures-perf-log', JSON.stringify(perfLog));
          }
        }
      }
      
      // Call user's onSuccess if provided
      if (queryOptions.onSuccess) {
        queryOptions.onSuccess(data);
      }
    }
  });

  // Enhanced return object with additional utilities
  return {
    ...queryResult,
    
    // Computed state helpers
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    isSuccess: queryResult.isSuccess,
    hasData: !!queryResult.data,
    
    // Data accessors with safe defaults
    spotPrice: queryResult.data?.spotPrice || 0,
    futuresPrice: queryResult.data?.futuresPrice || 0,
    annualizedBasis: queryResult.data?.annualizedBasis || 0,
    regime: queryResult.data?.regime || 'healthy',
    regimeData: queryResult.data?.regimeData || null,
    daysToExpiry: queryResult.data?.daysToExpiry || 90,
    
    // Metadata accessors
    dataSource: queryResult.data?._metadata?.dataSource || 'unknown',
    lastUpdate: queryResult.data?._metadata?.timestamp || null,
    fetchTime: queryResult.data?._metadata?.fetchTime || null,
    nextUpdate: queryResult.data?._metadata?.nextUpdate || null,
    
    // Helper methods
    isUsingMockData: () => {
      const source = queryResult.data?._metadata?.dataSource;
      return source === 'mock' || source === 'fallback' || source === 'cached_fallback';
    },
    
    isDataFresh: () => {
      const timestamp = queryResult.data?._metadata?.timestamp;
      if (!timestamp) return false;
      
      const age = Date.now() - timestamp;
      return age < staleTime;
    },
    
    // Force refresh method
    refetch: queryResult.refetch,
    
    // Performance monitoring helpers
    getPerformanceLog: () => {
      if (typeof window === 'undefined') return [];
      try {
        return JSON.parse(sessionStorage.getItem('futures-perf-log') || '[]');
      } catch {
        return [];
      }
    },
    
    clearPerformanceLog: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('futures-perf-log');
      }
    }
  };
};

/**
 * Simplified hook for basic usage
 */
export const useFuturesBasis = (options = {}) => {
  const result = useOptimizedFuturesBasis(options);
  
  return {
    data: result.data,
    loading: result.isLoading,
    error: result.error,
    refetch: result.refetch
  };
};

export default useOptimizedFuturesBasis;