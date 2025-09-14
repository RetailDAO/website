// Performance-optimized Liquidity Pulse card with sparkline for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';

// Enhanced US 2Y Treasury yield chart component - Full width version
const US2YChart = React.memo(({ data, colors, height = 80, width = 400 }) => {
  const { points, currentValue, minValue, maxValue } = useMemo(() => {
    if (!data || data.length < 2) return { points: '', currentValue: 0, minValue: 0, maxValue: 0 };

    const padding = 8;
    const actualWidth = width - padding * 2;
    const actualHeight = height - padding * 2;
    
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue;
    const currentValue = data[data.length - 1];
    
    if (range === 0) {
      const y = actualHeight / 2 + padding;
      return { 
        points: `M${padding},${y} L${width - padding},${y}`, 
        currentValue, 
        minValue, 
        maxValue 
      };
    }
    
    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * actualWidth + padding;
        const y = actualHeight - ((value - minValue) / range) * actualHeight + padding;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
      
    return { points, currentValue, minValue, maxValue };
  }, [data, height]);

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className={`text-sm ${colors.text.secondary}`}>No chart data</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" className={colors.text.secondary} />
        
        {/* Chart line */}
        <path
          d={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(59, 130, 246, 0.3))' }}
        />
        
        {/* Current value indicator */}
        <circle
          cx={width - 8}
          cy={height - ((currentValue - minValue) / (maxValue - minValue)) * (height - 16) - 8}
          r="3"
          fill="#3b82f6"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs" style={{ marginLeft: '-2rem' }}>
        <span className={colors.text.muted}>{maxValue.toFixed(2)}%</span>
        <span className={colors.text.muted}>{minValue.toFixed(2)}%</span>
      </div>
    </div>
  );
});

// Import API service
import apiService from '../../../services/api';

// Status state mapping based on 30-day change in basis points
const getLiquidityStatus = (change30Day) => {
  if (change30Day <= -25) return {
    status: 'easing',
    label: 'Easing (Risk-On)',
    color: '#10b981', // Green
    description: 'Yields dropped ≥25 bps'
  };
  if (change30Day >= 25) return {
    status: 'tightening',
    label: 'Tightening (Risk-Off)',
    color: '#ef4444', // Red
    description: 'Yields rose ≥25 bps'
  };
  return {
    status: 'neutral',
    label: 'Neutral',
    color: '#f59e0b', // Yellow
    description: 'Between -25 and +25 bps'
  };
};

// Simple status indicator component
const StatusIndicator = React.memo(({ statusInfo, colors }) => {
  return (
    <div className="text-center">
      <div
        className="text-sm font-semibold px-3 py-1 rounded"
        style={{
          backgroundColor: statusInfo.color + '20',
          color: statusInfo.color,
          border: `1px solid ${statusInfo.color}40`
        }}
      >
        {statusInfo.label}
      </div>
    </div>
  );
});


// Helper function to format cache age
const formatCacheAge = (ageMs) => {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return seconds > 0 ? `${seconds}s ago` : 'Just now';
};

const LiquidityPulseCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('LiquidityPulseCard');
  
  // Cache-first data loading - display cached data immediately without API calls
  const { data: apiResponse, isLoading, error, isFetching } = useQuery({
    queryKey: ['liquidity-pulse', '30D'],
    queryFn: () => apiService.getLiquidityPulse('30D'),
    staleTime: Infinity, // Never consider cached data stale - true cache-first
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry on mount, only background refresh
    networkMode: 'offlineFirst',
    initialDataUpdatedAt: 0
  });

  // Extract data from API response with cache age calculation
  const data = useMemo(() => {
    if (apiResponse?.success && apiResponse?.data) {
      const dataTimestamp = apiResponse.data.metadata?.timestamp || Date.now();
      const cacheAge = Date.now() - dataTimestamp;
      
      return {
        ...apiResponse.data,
        _fromCache: apiResponse._fromCache,
        _isStale: apiResponse._isStale,
        cacheAge: cacheAge,
        cacheAgeFormatted: formatCacheAge(cacheAge)
      };
    }
    return null;
  }, [apiResponse]);

  // Memoize chart data for performance
  const chartData = useMemo(() => {
    if (!data?.treasury2Y?.data) return null;
    
    // Extract yields for chart (last 30 points for better visualization)
    return data.treasury2Y.data
      .slice(-30)
      .map(item => item.yield);
  }, [data?.treasury2Y?.data]);

  // Calculate 30-day change and status
  const liquidityStatusInfo = useMemo(() => {
    const change30Day = data?.pulse?.analysis?.trend30Day || 0;
    return getLiquidityStatus(change30Day);
  }, [data?.pulse?.analysis?.trend30Day]);

  // Get current 30-day change for display
  const change30Day = data?.pulse?.analysis?.trend30Day || 0;

  // Only show loading for initial load (no cached data)
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col p-4" style={{ minHeight: '280px', maxHeight: '320px' }}>
        {/* Header skeleton */}
        <div className="mb-2">
          <div className={`h-4 w-28 rounded ${colors.bg.tertiary} animate-pulse mb-1`}></div>
          <div className={`h-3 w-20 rounded ${colors.bg.tertiary} animate-pulse`}></div>
          <span className={`text-xs font-mono ${colors.text.highlight} animate-pulse`}>
            [LOADING_CACHE...]
          </span>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`h-12 w-12 rounded-full ${colors.bg.tertiary} animate-pulse mx-auto mb-2`}></div>
            <div className={`h-4 w-28 rounded ${colors.bg.tertiary} animate-pulse mx-auto mb-2`}></div>
            <div className={`h-3 w-20 rounded ${colors.bg.tertiary} animate-pulse mx-auto`}></div>
            <div className={`mt-4 text-xs ${colors.text.muted} font-mono`}>
              RETRIEVING_CACHED_DATA
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className={`text-center ${colors.text.secondary}`}>
          <p className="text-red-500 mb-2">⚠️ Failed to load Liquidity Pulse</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  const currentYield = data?.treasury2Y?.current?.yield;

  return (
    <div className="h-full flex flex-col">
      {/* Header - Now at the top */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [LIQUIDITY_PULSE]
          </h3>
          <p className={`text-xs ${colors.text.secondary}`}>
            States (30-day change)
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-2">
            {data?._fromCache && (
              <span 
                className={`text-xs font-mono ${data._isStale ? colors.text.accent : colors.text.positive} cursor-help`} 
                title={generateTransparencyTooltip({
                  ...extractTransparencyData(data),
                  existingTooltip: data._isStale ? "Showing cached data, updating..." : "Fresh cached data"
                })}
              >
                [{data._isStale ? 'CACHE*' : 'CACHE'}]
              </span>
            )}
            
            {isFetching && (
              <span className={`text-xs font-mono ${colors.text.highlight} animate-pulse`} title="Updating data in background">
                [UPD...]
              </span>
            )}
            
            {!data?._fromCache && !isFetching && (
              <span className={`text-xs font-mono ${colors.text.positive}`} title="Live data from server">
                [LIVE]
              </span>
            )}
            
            {error && (
              <span className={`text-xs font-mono ${colors.text.negative}`} title="Using fallback data">
                [FALLBACK]
              </span>
            )}
          </div>
          
          {data && (
            <div className={`text-xs ${colors.text.muted}`}>
              {data.cacheAgeFormatted || 'Just now'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - US 2Y Treasury Chart */}
      <div className="flex-1 mb-4">
        <div className="mb-3">
          <h4 className={`text-lg font-semibold ${colors.text.primary}`}>
            US 2Y Treasury Yield
          </h4>
          <div className={`text-2xl font-bold ${colors.text.primary}`}>
            {currentYield}%
            <span className={`text-base font-normal ${colors.text.secondary} ml-3`}>
              30D: {change30Day > 0 ? '+' : ''}{change30Day}bps
            </span>
          </div>
        </div>
        {chartData && (
          <US2YChart
            data={chartData}
            colors={colors}
            height={80}
            width={400}
          />
        )}
      </div>

      {/* Status Indicator at Bottom */}
      <div className="flex justify-center">
        <StatusIndicator statusInfo={liquidityStatusInfo} colors={colors} />
      </div>

      {/* Development metadata */}
      {process.env.NODE_ENV === 'development' && data?.metadata && (
        <div className={`mt-2 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          FRED • {data.metadata.dataPoints} points • 
          {data.metadata.fresh ? ' 🔥 Fresh' : ' 💾 Cached'} • 
          {Math.round(data.metadata.processingTime)}ms
        </div>
      )}
    </div>
  );
});

// Display names for better debugging
US2YChart.displayName = 'US2YChart';
StatusIndicator.displayName = 'StatusIndicator';
LiquidityPulseCard.displayName = 'LiquidityPulseCard';

export default LiquidityPulseCard;