import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIndicatorStream } from './useWebSocket';
import apiService from '../services/api';

/**
 * Hook for managing real-time and cached indicator data
 * Provides seamless integration with existing components
 */
export function useIndicatorData(symbols = ['BTC', 'ETH', 'SOL'], options = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hybridData, setHybridData] = useState({});
  
  const {
    enableRealTimeUpdates = true,
    fallbackToApi = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    requireFreshData = false
  } = options;

  // Convert symbols to WebSocket format (BTC -> BTCUSDT)
  const wsSymbols = useMemo(() => {
    return symbols.map(symbol => {
      const normalized = symbol.toUpperCase();
      return normalized.endsWith('USDT') ? normalized : `${normalized}USDT`;
    });
  }, [symbols]);

  // WebSocket connection for real-time updates
  const {
    indicators: wsIndicators,
    isConnected: wsConnected,
    isHealthy: wsHealthy,
    getIndicator,
    isDataFresh
  } = useIndicatorStream({
    autoSubscribe: enableRealTimeUpdates ? wsSymbols : [],
    enableDataMerging: true,
    fallbackToAPI: fallbackToApi
  });

  // Fetch initial data from API
  const fetchInitialData = useCallback(async () => {
    if (!fallbackToApi) return;
    
    setLoading(true);
    setError(null);

    try {
      // Use the multi-analysis endpoint for better performance
      const symbolsQuery = symbols.join(',');
      const response = await apiService.getAllMarketDataWithAnalysis();
      
      if (response.success) {
        const apiData = {};
        
        symbols.forEach(symbol => {
          const normalized = symbol.toLowerCase();
          const data = response.data[normalized];
          
          if (data) {
            const wsSymbol = symbol.toUpperCase().endsWith('USDT') ? 
              symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
            
            // Transform API data to match WebSocket format
            apiData[wsSymbol] = {
              symbol: wsSymbol,
              timestamp: new Date().toISOString(),
              rsi: data.rsi ? transformRSIData(data.rsi) : {},
              movingAverages: data.movingAverages ? transformMAData(data.movingAverages) : {},
              current: {
                price: data.currentPrice,
                change24h: data.priceChange24h,
                volume24h: data.volume24h,
                marketCap: data.marketCap
              },
              source: 'api',
              received: new Date(),
              cached: true
            };
          }
        });
        
        setHybridData(apiData);
      } else {
        throw new Error('Failed to fetch market data');
      }
    } catch (err) {
      console.error('Error fetching initial indicator data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbols, fallbackToApi]);

  // Transform API RSI data to match WebSocket format
  const transformRSIData = useCallback((rsiData) => {
    const transformed = {};
    Object.entries(rsiData).forEach(([period, data]) => {
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1];
        transformed[period] = {
          current: latest.value,
          timestamp: latest.timestamp,
          status: latest.value > 70 ? 'Overbought' : latest.value < 30 ? 'Oversold' : 'Normal'
        };
      }
    });
    return transformed;
  }, []);

  // Transform API MA data to match WebSocket format
  const transformMAData = useCallback((maData) => {
    const transformed = {};
    Object.entries(maData).forEach(([period, data]) => {
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1];
        transformed[period] = {
          current: latest.value,
          timestamp: latest.timestamp,
          pricePosition: 'unknown', // Will be calculated if current price is available
          deviation: 0
        };
      }
    });
    return transformed;
  }, []);

  // Merge WebSocket and API data
  const mergedData = useMemo(() => {
    const merged = { ...hybridData };
    
    Object.entries(wsIndicators).forEach(([symbol, wsData]) => {
      if (wsSymbols.includes(symbol)) {
        const existing = merged[symbol] || {};
        
        // Prefer WebSocket data when available and fresh
        const useWSData = wsConnected && wsHealthy && (!requireFreshData || isDataFresh(symbol));
        
        merged[symbol] = useWSData ? {
          ...existing,
          ...wsData,
          dataSource: wsData.source || 'websocket'
        } : {
          ...existing,
          lastWSUpdate: wsData.received,
          dataSource: existing.source || 'api'
        };
      }
    });
    
    return merged;
  }, [hybridData, wsIndicators, wsSymbols, wsConnected, wsHealthy, requireFreshData, isDataFresh]);

  // Get indicator data for a specific symbol
  const getSymbolIndicators = useCallback((symbol) => {
    const wsSymbol = symbol.toUpperCase().endsWith('USDT') ? 
      symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
    
    return mergedData[wsSymbol] || null;
  }, [mergedData]);

  // Get RSI for a specific symbol and period
  const getRSI = useCallback((symbol, period = 14) => {
    const data = getSymbolIndicators(symbol);
    return data?.rsi?.[period] || null;
  }, [getSymbolIndicators]);

  // Get Moving Average for a specific symbol and period
  const getMovingAverage = useCallback((symbol, period = 20) => {
    const data = getSymbolIndicators(symbol);
    return data?.movingAverages?.[period] || null;
  }, [getSymbolIndicators]);

  // Get current price for a symbol
  const getCurrentPrice = useCallback((symbol) => {
    const data = getSymbolIndicators(symbol);
    return data?.current || null;
  }, [getSymbolIndicators]);

  // Check if data is available for all requested symbols
  const hasAllData = useMemo(() => {
    return wsSymbols.every(symbol => mergedData[symbol]);
  }, [wsSymbols, mergedData]);

  // Get data freshness info
  const getDataInfo = useCallback((symbol) => {
    const data = getSymbolIndicators(symbol);
    if (!data) return { available: false };
    
    const age = data.received ? Date.now() - new Date(data.received).getTime() : null;
    
    return {
      available: true,
      source: data.dataSource || 'unknown',
      age: age ? Math.round(age / 1000) : null, // seconds
      fresh: age ? age < 10 * 60 * 1000 : false, // less than 10 minutes
      lastUpdate: data.received
    };
  }, [getSymbolIndicators]);

  // Initial data fetch - DISABLED to prevent rate limiting
  useEffect(() => {
    // fetchInitialData(); // Temporarily disabled - data comes from Dashboard
  }, [fetchInitialData]);

  // Periodic refresh for API data (when WebSocket is not available) - DISABLED to prevent rate limiting
  useEffect(() => {
    // if (!fallbackToApi || !refreshInterval) return;
    
    // const interval = setInterval(() => {
    //   if (!wsConnected || !wsHealthy) {
    //     console.log('WebSocket not healthy, refreshing from API...');
    //     fetchInitialData();
    //   }
    // }, refreshInterval);

    // return () => clearInterval(interval);
  }, [fallbackToApi, refreshInterval, wsConnected, wsHealthy, fetchInitialData]);

  return {
    // Data access
    indicators: mergedData,
    getSymbolIndicators,
    getRSI,
    getMovingAverage,
    getCurrentPrice,
    
    // Status information
    loading,
    error,
    hasAllData,
    getDataInfo,
    
    // WebSocket status
    wsConnected,
    wsHealthy,
    
    // Utility methods
    refresh: fetchInitialData,
    symbols: wsSymbols,
    
    // Raw data for debugging
    rawWSData: wsIndicators,
    rawAPIData: hybridData
  };
}

/**
 * Simplified hook for single symbol indicator data
 */
export function useSymbolIndicators(symbol, options = {}) {
  const { indicators, ...rest } = useIndicatorData([symbol], options);
  
  const wsSymbol = symbol.toUpperCase().endsWith('USDT') ? 
    symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
  
  const symbolData = indicators[wsSymbol] || {};
  
  return {
    ...rest,
    rsi: symbolData.rsi || {},
    movingAverages: symbolData.movingAverages || {},
    current: symbolData.current || {},
    timestamp: symbolData.timestamp,
    dataSource: symbolData.dataSource,
    
    // Convenience getters
    rsi14: symbolData.rsi?.[14]?.current,
    rsi21: symbolData.rsi?.[21]?.current,
    rsi30: symbolData.rsi?.[30]?.current,
    ma20: symbolData.movingAverages?.[20]?.current,
    ma50: symbolData.movingAverages?.[50]?.current,
    ma100: symbolData.movingAverages?.[100]?.current,
    ma200: symbolData.movingAverages?.[200]?.current,
    
    // RSI status
    rsiStatus: symbolData.rsi?.[14]?.status || 'Unknown'
  };
}

/**
 * Hook for getting real-time price updates
 */
export function usePriceStream(symbols = ['BTC', 'ETH', 'SOL']) {
  const { indicators, wsConnected, wsHealthy } = useIndicatorData(symbols, {
    enableRealTimeUpdates: true,
    fallbackToApi: true,
    requireFreshData: true
  });

  const prices = useMemo(() => {
    const priceData = {};
    
    symbols.forEach(symbol => {
      const wsSymbol = symbol.toUpperCase().endsWith('USDT') ? 
        symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
      
      const data = indicators[wsSymbol];
      if (data?.current) {
        priceData[symbol.toUpperCase()] = {
          price: data.current.price,
          change24h: data.current.change24h,
          volume24h: data.current.volume24h,
          marketCap: data.current.marketCap,
          lastUpdate: data.received,
          source: data.dataSource
        };
      }
    });
    
    return priceData;
  }, [indicators, symbols]);

  return {
    prices,
    connected: wsConnected,
    healthy: wsHealthy,
    symbols
  };
}