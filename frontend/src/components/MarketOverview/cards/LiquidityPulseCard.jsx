// Performance-optimized Liquidity Pulse card with sparkline for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';

// Simple sparkline component (lightweight alternative to full charts)
const Sparkline = React.memo(({ data, color = '#10b981', height = 40 }) => {
  const points = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const width = 120; // Fixed width for consistency
    const padding = 4;
    const actualWidth = width - padding * 2;
    const actualHeight = height - padding * 2;
    
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue;
    
    if (range === 0) {
      // Flat line if no variation
      const y = actualHeight / 2 + padding;
      return `M${padding},${y} L${width - padding},${y}`;
    }
    
    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * actualWidth + padding;
        const y = actualHeight - ((value - minValue) / range) * actualHeight + padding;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, height]);

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width: 120, height }}>
        <span className="text-xs text-gray-400">No trend data</span>
      </div>
    );
  }

  return (
    <svg width={120} height={height} className="overflow-visible">
      <path
        d={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
      />
    </svg>
  );
});

// Optimized API service
const fetchLiquidityPulse = async (timeframe = '30D') => {
  const startTime = performance.now();
  
  const response = await fetch(`/api/v1/market-overview/liquidity-pulse?timeframe=${timeframe}`);
  if (!response.ok) {
    throw new Error(`Liquidity Pulse API error: ${response.status}`);
  }
  
  const result = await response.json();
  const duration = performance.now() - startTime;
  
  console.log(`📈 Liquidity Pulse API: ${Math.round(duration)}ms`);
  
  return result.data;
};

// Pulse level configuration with theme support
const getPulseLevelConfig = (level, colors) => {
  const configs = {
    'abundant': {
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: '💰',
      label: 'Abundant',
      description: 'Very supportive for risk assets'
    },
    'adequate': {
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: '💧',
      label: 'Adequate',
      description: 'Generally supportive environment'
    },
    'neutral': {
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-700',
      icon: '⚖️',
      label: 'Neutral',
      description: 'Balanced conditions'
    },
    'tightening': {
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      icon: '⚠️',
      label: 'Tightening',
      description: 'Caution advised'
    },
    'constrained': {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '🚨',
      label: 'Constrained',
      description: 'Risk-off environment'
    }
  };
  
  return configs[level] || configs['neutral'];
};

// Trend direction indicator
const TrendIndicator = React.memo(({ trend, value, colors }) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.02; // Less than 2 basis points
  
  if (isNeutral) {
    return (
      <span className={`inline-flex items-center text-xs ${colors.text.secondary}`}>
        <span className="mr-1">➡️</span>
        Stable
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center text-xs ${
      isPositive ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'
    }`}>
      <span className="mr-1">{isPositive ? '📈' : '📉'}</span>
      {isPositive ? 'Rising' : 'Falling'}
    </span>
  );
});

const LiquidityPulseCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('LiquidityPulseCard');
  
  // Optimized data fetching with intelligent caching
  const { data, isLoading, error, isStale } = useQuery({
    queryKey: ['liquidity-pulse'],
    queryFn: () => fetchLiquidityPulse('30D'),
    staleTime: 30 * 60 * 1000, // 30 minutes - FRED data updates daily
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Memoize sparkline data for performance
  const sparklineData = useMemo(() => {
    if (!data?.treasury2Y?.data) return null;
    
    // Extract yields for sparkline (last 20 points for better performance)
    return data.treasury2Y.data
      .slice(-20)
      .map(item => item.yield);
  }, [data?.treasury2Y?.data]);

  // Memoize pulse level config
  const pulseConfig = useMemo(() => {
    if (!data?.pulse?.level) return null;
    return getPulseLevelConfig(data.pulse.level, colors);
  }, [data?.pulse?.level, colors]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-4" style={{ minHeight: '280px', maxHeight: '320px' }}>
        {/* Header skeleton */}
        <div className="mb-4">
          <div className={`h-5 w-32 rounded ${colors.bg.tertiary} animate-pulse mb-2`}></div>
          <div className={`h-3 w-24 rounded ${colors.bg.tertiary} animate-pulse`}></div>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`h-16 w-16 rounded-full ${colors.bg.tertiary} animate-pulse mx-auto mb-4`}></div>
            <div className={`h-5 w-32 rounded ${colors.bg.tertiary} animate-pulse mx-auto mb-2`}></div>
            <div className={`h-4 w-24 rounded ${colors.bg.tertiary} animate-pulse mx-auto`}></div>
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
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  const currentYield = data?.treasury2Y?.current?.yield;
  const pulseScore = data?.pulse?.score;
  const trend = data?.pulse?.analysis;

  return (
    <div className="h-full flex flex-col p-4" style={{ minHeight: '280px', maxHeight: '320px' }}>
      {/* Header - compact terminal style */}
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className={`text-sm md:text-base font-mono uppercase tracking-wider ${colors.text.primary}`}>
              [LIQUIDITY_PULSE]
            </h3>
            <p className={`text-xs ${colors.text.secondary} mt-1`}>
              2Y Treasury Yield Analysis
            </p>
          </div>
          {isStale && (
            <span className="text-xs text-yellow-500" title="Data is stale, refreshing...">
              ⏳
            </span>
          )}
        </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Pulse Score Display */}
        <div className="text-center mb-6">
          <div className={`text-4xl font-bold mb-2 ${colors.text.primary}`}>
            {pulseScore}
            <span className={`text-lg font-normal ${colors.text.secondary} ml-1`}>
              /100
            </span>
          </div>
          
          {/* Pulse Level Badge */}
          {pulseConfig && (
            <div className={`
              inline-flex items-center px-3 py-2 rounded-full text-sm font-medium
              ${pulseConfig.bg} ${pulseConfig.color} ${pulseConfig.border} border
            `}>
              <span className="mr-2">{pulseConfig.icon}</span>
              {pulseConfig.label}
            </div>
          )}
        </div>

        {/* Treasury Yield Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${colors.text.primary}`}>
              {currentYield}%
            </div>
            <div className={`text-xs ${colors.text.secondary}`}>
              2Y Treasury
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-1">
              {sparklineData && (
                <Sparkline 
                  data={sparklineData} 
                  color={pulseConfig?.color.includes('green') ? '#10b981' : 
                         pulseConfig?.color.includes('red') ? '#ef4444' : '#6b7280'} 
                />
              )}
            </div>
            <div className={`text-xs ${colors.text.secondary}`}>
              30-Day Trend
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        {trend && (
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className={`text-sm font-medium ${colors.text.primary}`}>
                {trend.trend7Day > 0 ? '+' : ''}{trend.trend7Day}bp
              </div>
              <div className={`text-xs ${colors.text.secondary}`}>
                7-Day Change
              </div>
            </div>
            
            <div className="text-center flex-1">
              <TrendIndicator 
                trend={trend.trend30Day} 
                value={trend.trend30Day} 
                colors={colors} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer with description */}
      <div className={`mt-4 p-3 rounded-lg ${colors.bg.tertiary}`}>
        <div className={`text-xs ${colors.text.primary}`}>
          {data?.pulse?.description || 'Liquidity conditions analysis'}
        </div>
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
Sparkline.displayName = 'Sparkline';
TrendIndicator.displayName = 'TrendIndicator';
LiquidityPulseCard.displayName = 'LiquidityPulseCard';

export default LiquidityPulseCard;