// Performance-optimized State of Leverage card for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';

// Import API service
import apiService from '../../../services/api';

// Optimized API service
const fetchLeverageState = async () => {
  const startTime = performance.now();
  
  const result = await apiService.getLeverageState();
  const duration = performance.now() - startTime;
  
  console.log(`📊 Leverage State API: ${Math.round(duration)}ms`);
  
  return result.data;
};

// Terminal-style state configuration optimized for all themes
const getStateConfig = (state, colors) => {
  const configs = {
    'green': {
      color: colors.text.positive,
      bg: colors.bg.tertiary,
      border: colors.border.positive,
      icon: '🟢',
      terminalLabel: '[SQUEEZE]',
      bgClass: 'bg-green-100 dark:bg-green-900/20'
    },
    'yellow': {
      color: colors.text.accent,
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '🟡',
      terminalLabel: '[BALANCED]',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/20'
    },
    'red': {
      color: colors.text.negative,
      bg: colors.bg.tertiary,
      border: colors.border.negative,
      icon: '🔴',
      terminalLabel: '[FLUSH]',
      bgClass: 'bg-red-100 dark:bg-red-900/20'
    }
  };
  
  return configs[state] || configs['yellow'];
};

// Traffic Light Component with terminal styling
const TrafficLight = React.memo(({ state, colors, size = 'md' }) => {
  const stateConfig = getStateConfig(state, colors);
  const sizeClass = size === 'lg' ? 'text-4xl p-2' : 'text-2xl p-1';
  
  return (
    <div className={`
      flex items-center justify-center rounded-lg
      ${stateConfig.bgClass} ${sizeClass}
      border ${stateConfig.border}
    `} style={{ borderRadius: '8px' }}>
      <div className="text-center">
        {stateConfig.icon}
      </div>
    </div>
  );
});

// Terminal status indicator
const StatusIndicator = React.memo(({ state, stateLabel, colors }) => {
  const stateConfig = getStateConfig(state, colors);
  
  return (
    <div className={`
      flex items-center space-x-2 px-3 py-1 text-sm font-mono uppercase tracking-wider
      ${colors.bg.tertiary} ${colors.border.primary} border-0
      ${stateConfig.color}
    `} style={{borderRadius: '0px'}}>
      <span>{stateConfig.terminalLabel}</span>
      <span className={colors.text.muted}>STATE</span>
    </div>
  );
});

// Metric display component
const MetricDisplay = React.memo(({ label, value, colors }) => (
  <div className="text-center">
    <div className={`text-lg font-mono ${colors.text.primary}`}>
      {value}
    </div>
    <div className={`text-xs ${colors.text.muted} uppercase tracking-wide`}>
      {label}
    </div>
  </div>
));

const StateOfLeverageCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('StateOfLeverageCard');
  
  // Optimized data fetching with intelligent caching
  const { data, isLoading, error, isStale } = useQuery({
    queryKey: ['leverage-state'],
    queryFn: fetchLeverageState,
    staleTime: 3 * 60 * 1000, // 3 minutes - leverage changes frequently
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Memoized state configuration
  const stateConfig = useMemo(() => {
    if (!data) return null;
    return getStateConfig(data.state, colors);
  }, [data?.state, colors]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading Leverage State...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <p className="text-red-500 mb-2">⚠️ Failed to load Leverage State</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [STATE_OF_LEVERAGE]
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <StatusIndicator 
            state={data.state} 
            stateLabel={data.stateLabel} 
            colors={colors} 
          />
          {isStale && (
            <span className={`text-xs font-mono ${colors.text.accent}`} title="Data refresh in progress">
              [REF...]
            </span>
          )}
        </div>
      </div>

      {/* Compact Content */}
      <div className="flex-1 flex flex-col items-center min-h-0">
        {/* Smaller Traffic Light */}
        <div className="mb-2">
          <TrafficLight state={data.state} colors={colors} size="md" />
        </div>
        
        {/* Compact State Label */}
        <div className="text-center mb-2">
          <div className={`text-sm font-semibold ${stateConfig.color}`}>
            {data.stateLabel.toUpperCase()}
          </div>
        </div>

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full px-2 mb-2">
          <MetricDisplay 
            label="OI Percentile" 
            value={`${data.score.oi}%`}
            colors={colors}
          />
          <MetricDisplay 
            label="Funding Rate" 
            value={`${data.fundingRate.average > 0 ? '+' : ''}${data.fundingRate.average}%`}
            colors={colors}
          />
        </div>

        {/* Compact Analysis Box */}
        <div className={`mt-auto p-2 w-full ${colors.bg.tertiary} border ${colors.border.primary}`} 
             style={{ borderRadius: '0px' }}>
          <div className={`text-xs font-medium ${colors.text.secondary} mb-1 uppercase tracking-wide`}>
            Analysis
          </div>
          <div className={`text-sm ${colors.text.primary}`}>
            {data.analysis.sentiment}
          </div>
          <div className={`text-xs ${colors.text.muted} leading-tight`}>
            {data.description}
          </div>
        </div>
      </div>

      {/* Footer with metadata - only in development */}
      {process.env.NODE_ENV === 'development' && data.metadata && (
        <div className={`mt-4 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          {data.metadata.fresh ? '🔥 Fresh' : '💾 Cached'} • 
          {data.metadata.dataSource} • 
          {new Date(data.metadata.calculatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

// Display names for better debugging
TrafficLight.displayName = 'TrafficLight';
StatusIndicator.displayName = 'StatusIndicator';
MetricDisplay.displayName = 'MetricDisplay';
StateOfLeverageCard.displayName = 'StateOfLeverageCard';

export default StateOfLeverageCard;