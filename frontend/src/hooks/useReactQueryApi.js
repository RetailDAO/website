import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

// Query keys for consistent caching
export const queryKeys = {
  btcPrice: ['btc', 'price'],
  btcAnalysis: (timeframe = '1D') => ['btc', 'analysis', timeframe],
  dxyAnalysis: (timeframe = '30D') => ['dxy', 'analysis', timeframe],
  etfFlows: (dateRange = '30D') => ['etf', 'flows', dateRange],
  fundingRates: (symbol = 'BTC') => ['funding', 'rates', symbol],
  rsi: (symbol, timeframe, period) => ['rsi', symbol, timeframe, period],
  multiCrypto: (symbols, timeframe) => ['crypto', 'multi', symbols, timeframe],
  mARibbon: (symbol, timeframe) => ['ma', 'ribbon', symbol, timeframe]
};

// Custom hooks for each data type
export const useBTCPrice = () => {
  return useQuery({
    queryKey: queryKeys.btcPrice,
    queryFn: () => apiService.getBTCPrice(),
    staleTime: 30 * 1000, // 30 seconds for price data
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

export const useBTCAnalysis = (timeframe = '1D') => {
  return useQuery({
    queryKey: queryKeys.btcAnalysis(timeframe),
    queryFn: () => apiService.getBTCAnalysis(timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!timeframe,
  });
};

export const useDXYAnalysis = (timeframe = '30D') => {
  return useQuery({
    queryKey: queryKeys.dxyAnalysis(timeframe),
    queryFn: () => apiService.getDXYAnalysis(timeframe),
    staleTime: 15 * 60 * 1000, // 15 minutes for DXY
    retry: 2,
  });
};

export const useETFFlows = (dateRange = '30D') => {
  return useQuery({
    queryKey: queryKeys.etfFlows(dateRange),
    queryFn: () => apiService.getETFFlows(dateRange),
    staleTime: 30 * 60 * 1000, // 30 minutes for ETF data
  });
};

export const useFundingRates = (symbol = 'BTC') => {
  return useQuery({
    queryKey: queryKeys.fundingRates(symbol),
    queryFn: () => apiService.getFundingRates(symbol),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useRSI = (symbol = 'BTC', timeframe = '1D', period = 14) => {
  return useQuery({
    queryKey: queryKeys.rsi(symbol, timeframe, period),
    queryFn: () => apiService.getRSI(symbol, timeframe, period),
    staleTime: 10 * 60 * 1000, // 10 minutes for RSI
    enabled: !!symbol,
  });
};

export const useMultiCryptoAnalysis = (symbols = 'BTC,ETH', timeframe = '30D') => {
  return useQuery({
    queryKey: queryKeys.multiCrypto(symbols, timeframe),
    queryFn: () => apiService.getMultiCryptoAnalysis(symbols, timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // This is a critical endpoint
  });
};

export const useMARibbon = (symbol = 'BTC', timeframe = '7D') => {
  return useQuery({
    queryKey: queryKeys.mARibbon(symbol, timeframe),
    queryFn: () => apiService.getMARibbon(symbol, timeframe),
    staleTime: 10 * 60 * 1000, // 10 minutes for MA data
  });
};

// Compound hook for dashboard data (fetches multiple queries)
export const useDashboardData = () => {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.multiCrypto('BTC,ETH', '1Y'),
        queryFn: () => apiService.getMultiCryptoAnalysis('BTC,ETH', '1Y'),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: queryKeys.dxyAnalysis('30D'),
        queryFn: () => apiService.getDXYAnalysis('30D'),
        staleTime: 15 * 60 * 1000,
      },
      {
        queryKey: queryKeys.etfFlows('30D'),
        queryFn: () => apiService.getETFFlows('30D'),
        staleTime: 30 * 60 * 1000,
      },
      {
        queryKey: queryKeys.fundingRates('BTC'),
        queryFn: () => apiService.getFundingRates('BTC'),
        staleTime: 15 * 60 * 1000,
      }
    ]
  });

  const [cryptoQuery, dxyQuery, etfQuery, fundingQuery] = queries;

  return {
    crypto: cryptoQuery,
    dxy: dxyQuery,
    etf: etfQuery,
    funding: fundingQuery,
    isLoading: queries.some(query => query.isLoading),
    isError: queries.some(query => query.isError),
    errors: queries.filter(query => query.isError).map(query => query.error),
    refetchAll: () => queries.forEach(query => query.refetch()),
  };
};

// Hook for real-time data status (can be combined with WebSocket)
export const useDataFreshness = () => {
  const queryClient = useQueryClient();
  
  const getDataAge = (queryKey) => {
    const queryData = queryClient.getQueryData(queryKey);
    const queryState = queryClient.getQueryState(queryKey);
    
    if (!queryState?.dataUpdatedAt) return null;
    
    const age = Date.now() - queryState.dataUpdatedAt;
    return {
      ageMs: age,
      ageMinutes: Math.floor(age / 60000),
      isStale: age > (queryState.staleTime || 300000), // Default 5min stale time
      lastUpdated: new Date(queryState.dataUpdatedAt)
    };
  };

  return { getDataAge };
};

// Export a consolidated API hook that maintains backward compatibility
export const useApi = () => {
  return {
    // Individual hooks
    useBTCPrice,
    useBTCAnalysis,
    useDXYAnalysis,
    useETFFlows,
    useFundingRates,
    useRSI,
    useMultiCryptoAnalysis,
    useMARibbon,
    
    // Compound hooks
    useDashboardData,
    useDataFreshness,
    
    // Query keys for manual cache management
    queryKeys
  };
};