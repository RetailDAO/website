// Performance-optimized Moving Averages card for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';

// Optimized API service
const fetchMovingAverages = async () => {
  const startTime = performance.now();
  
  const response = await fetch('/api/v1/market-overview/moving-averages');
  if (!response.ok) {
    throw new Error(`Moving Averages API error: ${response.status}`);
  }
  
  const result = await response.json();
  const duration = performance.now() - startTime;
  
  console.log(`📊 Moving Averages API: ${Math.round(duration)}ms`);
  
  return result.data;
};

// Terminal-style status configuration optimized for all themes
const getStatusConfig = (status, colors) => {
  const configs = {
    'Overheated': {
      color: colors.text.negative,
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '[HOT]',
      label: 'OVERHEATED'
    },
    'Stretched': {
      color: colors.text.accent, 
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '[HIGH]',
      label: 'STRETCHED'
    },
    'Normal': {
      color: colors.text.positive,
      bg: colors.bg.tertiary, 
      border: colors.border.secondary,
      icon: '[OK]',
      label: 'NORMAL'
    },
    'Discounted': {
      color: colors.text.highlight,
      bg: colors.bg.tertiary,
      border: colors.border.secondary, 
      icon: '[LOW]',
      label: 'DISCOUNTED'
    },
    'Oversold': {
      color: colors.text.highlight,
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '[DEEP]',
      label: 'OVERSOLD'
    }
  };
  
  return configs[status] || configs['Normal'];
};

// Terminal-style regime indicator
const RegimeIndicator = React.memo(({ regime, colors }) => {
  const isBull = regime === 'Bull';
  
  return (
    <div className={`
      flex items-center space-x-2 px-3 py-1 text-sm font-mono uppercase tracking-wider
      ${colors.bg.tertiary} ${colors.border.primary} border-0
      ${isBull ? colors.text.positive : colors.text.negative}
    `} style={{borderRadius: '0px'}}>
      <span>{isBull ? '[BULL]' : '[BEAR]'}</span>
      <span className={colors.text.muted}>REGIME</span>
    </div>
  );
});

// MA Row component for displaying individual MA data
const MARow = React.memo(({ label, value, deviation, status, colors }) => {
  const statusConfig = getStatusConfig(status, colors);
  
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-medium ${colors.text.secondary}`}>
          {label}
        </span>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className={`text-sm font-mono ${colors.text.primary}`}>
          ${value.toLocaleString()}
        </span>
        
        <div className="flex items-center space-x-1">
          <span className={`text-xs ${statusConfig.color}`}>
            {deviation > 0 ? '+' : ''}{deviation}%
          </span>
          {status && (
            <span 
              className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border} border
              `}
              title={`Price is ${Math.abs(deviation)}% ${deviation > 0 ? 'above' : 'below'} ${label}`}
            >
              {statusConfig.icon} {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const MovingAveragesCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('MovingAveragesCard');
  
  // Optimized data fetching with intelligent caching
  const { data, isLoading, error, isStale } = useQuery({
    queryKey: ['moving-averages'],
    queryFn: fetchMovingAverages,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time for performance
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Memoize price change calculation for performance
  const priceChange = useMemo(() => {
    if (!data) return null;
    
    const change = data.ma50.deviation;
    return {
      value: change,
      isPositive: change > 0,
      magnitude: Math.abs(change)
    };
  }, [data?.ma50.deviation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading Moving Averages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <p className="text-red-500 mb-2">⚠️ Failed to load Moving Averages</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Terminal-style header with regime indicator - compact */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className={`text-sm md:text-base font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [MOVING_AVERAGES]
          </h3>
          <div className="flex items-center space-x-2 mt-2">
            <RegimeIndicator regime={data.ma200.regime} colors={colors} />
            {isStale && (
              <span className={`text-xs font-mono ${colors.text.accent}`} title="Data refresh in progress">
                [REFRESHING...]
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current Price Display - compact */}
      <div className="mb-4">
        <div className={`text-xl md:text-2xl font-bold ${colors.text.primary}`}>
          ${data.currentPrice.toLocaleString()}
        </div>
        <div className={`text-xs ${colors.text.secondary}`}>
          Current BTC Price
        </div>
      </div>

      {/* Moving Averages Data */}
      <div className="flex-1">
        <div className="space-y-1">
          <MARow
            label="50D MA"
            value={data.ma50.value}
            deviation={data.ma50.deviation}
            status={data.ma50.status}
            colors={colors}
          />
          
          <div className={`border-t ${colors.border.primary} my-2`}></div>
          
          <MARow
            label="200D MA"  
            value={data.ma200.value}
            deviation={data.ma200.deviation}
            status={null} // 200D shows regime instead
            colors={colors}
          />
        </div>

        {/* Analysis Summary */}
        <div className={`mt-4 p-3 rounded-lg ${colors.bg.tertiary}`}>
          <div className={`text-xs font-medium ${colors.text.secondary} mb-1`}>
            Analysis
          </div>
          <div className={`text-sm ${colors.text.primary}`}>
            {data.analysis.pricePosition}
          </div>
          
          {/* Signals */}
          <div className="flex flex-wrap gap-1 mt-2">
            {data.analysis.signals.goldenCross && (
              <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                ✨ Golden Cross
              </span>
            )}
            {data.analysis.signals.deathCross && (
              <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                ☠️ Death Cross
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer with metadata - only in development */}
      {process.env.NODE_ENV === 'development' && data.metadata && (
        <div className={`mt-4 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          {data.metadata.fresh ? '🔥 Fresh' : '💾 Cached'} • 
          {data.metadata.dataPoints} data points • 
          {new Date(data.metadata.calculatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

// Display names for better debugging
RegimeIndicator.displayName = 'RegimeIndicator';
MARow.displayName = 'MARow';
MovingAveragesCard.displayName = 'MovingAveragesCard';

export default MovingAveragesCard;