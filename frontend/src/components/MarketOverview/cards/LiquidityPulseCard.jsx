// Performance-optimized Liquidity Pulse card with sparkline for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';

// Enhanced US 2Y Treasury yield chart component
const US2YChart = React.memo(({ data, colors, height = 60 }) => {
  const { points, currentValue, minValue, maxValue } = useMemo(() => {
    if (!data || data.length < 2) return { points: '', currentValue: 0, minValue: 0, maxValue: 0 };
    
    const width = 200;
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
      <div className="flex items-center justify-center" style={{ width: 200, height }}>
        <span className={`text-sm ${colors.text.secondary}`}>No chart data</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width={200} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="200" height={height} fill="url(#grid)" className={colors.text.secondary} />
        
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
          cx={200 - 8}
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

// Traffic light state mapping based on 30-day change
const getTrafficLightState = (change30Day) => {
  if (change30Day <= -25) return 'easing'; // Green: ≤ -25 bps
  if (change30Day >= 25) return 'tightening'; // Red: ≥ +25 bps
  return 'neutral'; // Yellow: in between
};

// Stylish traffic lights component with glow effects
const TrafficLights = React.memo(({ state, colors }) => {
  const lights = {
    easing: { position: 'top', color: '#10b981', label: 'Easing', description: '≤ -25 bps' },
    neutral: { position: 'middle', color: '#f59e0b', label: 'Neutral', description: 'in between' },
    tightening: { position: 'bottom', color: '#ef4444', label: 'Tightening', description: '≥ +25 bps' }
  };

  const activeLight = lights[state];

  return (
    <div className="flex flex-col items-center space-y-1">
      {/* Traffic light container */}
      <div className={`relative bg-gray-800 dark:bg-gray-900 rounded-full p-2 border-2 ${colors.border.primary}`} style={{ width: '48px', height: '120px' }}>
        {/* Individual lights */}
        {Object.entries(lights).map(([lightState, config]) => {
          const isActive = state === lightState;
          return (
            <div
              key={lightState}
              className={`
                w-8 h-8 rounded-full mx-auto mb-1 last:mb-0 transition-all duration-500
                ${isActive 
                  ? `shadow-lg` 
                  : 'bg-gray-600 dark:bg-gray-700 opacity-30'
                }
              `}
              style={{
                backgroundColor: isActive ? config.color : undefined,
                boxShadow: isActive 
                  ? `0 0 20px ${config.color}40, 0 0 40px ${config.color}20, inset 0 0 10px ${config.color}30` 
                  : undefined
              }}
            />
          );
        })}
      </div>
      
      {/* Active state label */}
      <div className="text-center">
        <div className={`text-sm font-semibold ${colors.text.primary}`} style={{ color: activeLight.color }}>
          {activeLight.label}
        </div>
        <div className={`text-xs ${colors.text.secondary}`}>
          {activeLight.description}
        </div>
      </div>
    </div>
  );
});

// Trend direction indicator
const TrendIndicator = React.memo(({ trend, value, colors }) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.02; // Less than 2 basis points
  
  if (isNeutral) {
    return (
      <span className={`inline-flex items-center text-sm ${colors.text.secondary}`}>
        <span className="mr-1">➡️</span>
        Stable
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center text-sm ${
      isPositive ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'
    }`}>
      <span className="mr-1">{isPositive ? '📈' : '📉'}</span>
      {isPositive ? 'Rising' : 'Falling'}
    </span>
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

  // Calculate 30-day change and traffic light state
  const trafficLightState = useMemo(() => {
    if (!data?.pulse?.analysis?.trend30Day) return 'neutral';
    return getTrafficLightState(data.pulse.analysis.trend30Day);
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
  const pulseScore = data?.pulse?.score;
  const trend = data?.pulse?.analysis;

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

      {/* Chart and Traffic Lights Section - Improved spacing distribution */}
      <div className="flex items-center justify-between mb-2 flex-1 px-2">
        {/* US 2Y Treasury Chart */}
        <div className="flex-1 pr-4">
          <div className="mb-2">
            <h4 className={`text-sm font-semibold ${colors.text.primary}`}>
              US 2Y Treasury Yield
            </h4>
            <div className={`text-lg font-bold ${colors.text.primary}`}>
              {currentYield}%
              <span className={`text-sm font-normal ${colors.text.secondary} ml-2`}>
                30D: {change30Day > 0 ? '+' : ''}{change30Day}bps
              </span>
            </div>
          </div>
          {chartData && (
            <US2YChart 
              data={chartData} 
              colors={colors} 
              height={60}
            />
          )}
        </div>
        
        {/* Traffic Lights Indicator - Better positioning */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <TrafficLights state={trafficLightState} colors={colors} />
        </div>
      </div>

      {/* Third Hierarchy: Additional Info */}
      <div className="space-y-2">
        {/* Pulse Score */}
        <div className="text-center">
          <div className={`text-xl font-bold ${colors.text.primary}`}>
            {pulseScore}
            <span className={`text-sm font-normal ${colors.text.secondary} ml-1`}>
              /100 Liquidity Score
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        {trend && (
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className={`text-sm ${colors.text.secondary}`}>
                7-Day Change: <span className={`font-medium ${colors.text.primary}`}>
                  {trend.trend7Day > 0 ? '+' : ''}{trend.trend7Day}bp
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <TrendIndicator 
                trend={trend.trend30Day} 
                value={trend.trend30Day} 
                colors={colors} 
              />
            </div>
          </div>
        )}
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
TrafficLights.displayName = 'TrafficLights';
TrendIndicator.displayName = 'TrendIndicator';
LiquidityPulseCard.displayName = 'LiquidityPulseCard';

export default LiquidityPulseCard;