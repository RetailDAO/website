import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing real-time and cached indicator data
 * Provides seamless integration with existing components
 */
export function useIndicatorData(symbols = ['BTC', 'ETH', 'SOL'], options = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hybridData, setHybridData] = useState({});
  
  // Simplified - no complex options needed
  const { requireFreshData = false } = options;

  // Convert symbols to WebSocket format (BTC -> BTCUSDT)
  const wsSymbols = useMemo(() => {
    return symbols.map(symbol => {
      const normalized = symbol.toUpperCase();
      return normalized.endsWith('USDT') ? normalized : `${normalized}USDT`;
    });
  }, [symbols]);

  // Disabled complex indicator WebSocket - using simple price WebSocket only
  const wsIndicators = {};
  const wsConnected = false;
  const wsHealthy = false;
  const getIndicator = () => null;
  const isDataFresh = () => false;

  // Simplified - no initial data fetching, rely on Dashboard's API calls
  const fetchInitialData = useCallback(async () => {
    console.log('📊 useIndicatorData: Relying on Dashboard API calls for RSI/MA data');
    setLoading(false);
  }, []);

  // Removed transformation functions - Dashboard handles API data directly

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

  // Disabled - Dashboard handles all API calls
  useEffect(() => {
    console.log('📊 useIndicatorData: Dashboard manages API data, WebSocket only for prices');
  }, []);

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