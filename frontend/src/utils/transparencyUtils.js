// Utility functions for standardized transparency tooltips

// Helper function to format cache age
export const formatCacheAge = (ageMs) => {
  if (!ageMs || ageMs < 0) return 'Just now';
  
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return seconds > 0 ? `${seconds}s ago` : 'Just now';
};

// Helper function to get data source display name
export const getDataSourceDisplay = (dataSource) => {
  const sourceMap = {
    'coingecko': 'CoinGecko API',
    'yahoo_finance': 'Yahoo Finance API',
    'binance': 'Binance API',
    'fred': 'FRED API',
    'bybit_okx': 'Bybit + OKX APIs',
    'mixed': 'Multiple APIs',
    'real_api': 'Real Exchange APIs',
    'fallback': 'Fallback Data',
    'mock': 'Mock Data'
  };
  
  return sourceMap[dataSource] || dataSource || 'Unknown Source';
};

// Helper function to get data quality status
export const getDataQuality = (dataSource, isStale, isFresh) => {
  if (dataSource === 'mock' || dataSource === 'fallback') {
    return { status: 'Mock Data', icon: '🎭', color: 'orange' };
  }
  
  if (isStale) {
    return { status: 'Cached Data', icon: '💾', color: 'yellow' };
  }
  
  if (isFresh) {
    return { status: 'Fresh Data', icon: '🔥', color: 'green' };
  }
  
  return { status: 'Live Data', icon: '✅', color: 'blue' };
};

// Generate standardized transparency tooltip content
export const generateTransparencyTooltip = ({
  dataSource,
  lastUpdate,
  cacheAge,
  fresh,
  isStale,
  nextUpdate,
  dataPoints,
  processingTime,
  existingTooltip = '',
  separator = ' | '
}) => {
  const quality = getDataQuality(dataSource, isStale, fresh);
  const sourceDisplay = getDataSourceDisplay(dataSource);
  const cacheAgeFormatted = formatCacheAge(cacheAge);
  
  // Build transparency info array
  const transparencyInfo = [];
  
  // Data Quality & Source
  transparencyInfo.push(`${quality.icon} ${quality.status}`);
  transparencyInfo.push(`Source: ${sourceDisplay}`);
  
  // Last Update / Cache Age
  if (lastUpdate) {
    transparencyInfo.push(`Updated: ${new Date(lastUpdate).toLocaleString()}`);
  } else if (cacheAge !== undefined) {
    transparencyInfo.push(`Cache Age: ${cacheAgeFormatted}`);
  }
  
  // Data Points
  if (dataPoints) {
    transparencyInfo.push(`Data Points: ${dataPoints}`);
  }
  
  // Processing Time
  if (processingTime) {
    transparencyInfo.push(`Processing: ${Math.round(processingTime)}ms`);
  }
  
  // Next Update
  if (nextUpdate) {
    transparencyInfo.push(`Next Update: ${new Date(nextUpdate).toLocaleTimeString()}`);
  }
  
  // Combine with existing tooltip
  const transparencySection = transparencyInfo.join(separator);
  
  if (existingTooltip && existingTooltip.trim()) {
    return `${existingTooltip}\n\n--- Data Transparency ---\n${transparencySection}`;
  }
  
  return transparencySection;
};

// Get transparency info from API response data
export const extractTransparencyData = (data, apiResponse) => {
  return {
    dataSource: data?.metadata?.dataSource || data?.metadata?.source || 'unknown',
    lastUpdate: data?.metadata?.timestamp || data?.timestamp || data?.metadata?.calculatedAt,
    cacheAge: data?.cacheAge,
    fresh: data?.metadata?.fresh || data?._fromCache === false,
    isStale: data?._isStale || false,
    nextUpdate: data?.metadata?.nextRefresh || data?.metadata?.nextUpdate,
    dataPoints: data?.metadata?.dataPoints || data?.flows?.length || data?.data?.length,
    processingTime: data?.metadata?.processingTime || data?.metadata?.fetchTime
  };
};