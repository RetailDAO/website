import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export function useApi(apiCall, dependencies = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    refreshInterval = null, 
    initialLoad = true,
    onSuccess = null,
    onError = null 
  } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message || 'An error occurred');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, onSuccess, onError]);

  useEffect(() => {
    if (initialLoad) {
      fetchData();
    }

    let interval = null;
    if (refreshInterval) {
      interval = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, initialLoad, refreshInterval, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}

export function useBitcoinPrice(refreshInterval = 30000) {
  return useApi(() => apiService.getBTCPrice(), [], { refreshInterval });
}

export function useBitcoinAnalysis(timeframe = '1D') {
  return useApi(() => apiService.getBTCAnalysis(timeframe), [timeframe]);
}

export function useDxyAnalysis(timeframe = '30D') {
  return useApi(() => apiService.getDXYAnalysis(timeframe), [timeframe]);
}

export function useFundingRates(symbol = 'BTC', exchange = null, refreshInterval = 60000) {
  return useApi(
    () => apiService.getFundingRates(symbol, exchange), 
    [symbol, exchange], 
    { refreshInterval }
  );
}

export function useMARibbon(symbol = 'BTC', timeframe = '7D', refreshInterval = 30000) {
  return useApi(
    () => apiService.getMARibbon(symbol, timeframe), 
    [symbol, timeframe], 
    { refreshInterval }
  );
}

export function useHealthCheck(refreshInterval = 30000) {
  return useApi(() => apiService.healthCheck(), [], { refreshInterval });
}