// Performance-optimized State of Leverage card for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';
import GlitchButton from '../../ui/GlitchButton';

// Import API service
import apiService from '../../../services/api';

// Analysis text based on state
const getAnalysisText = (status) => {
  const analysisTexts = {
    'Squeeze Risk': 'Shorts Crowded, Potential Squeeze Coming',
    'Balanced': 'No Squeeze or Flush Risk Currently',
    'Flush Risk': 'Longs Crowded, Potential Flush Coming'
  };

  return analysisTexts[status] || 'No Squeeze or Flush Risk Currently';
};

// Optimized API service
const fetchLeverageState = async () => {
  const startTime = performance.now();
  
  const result = await apiService.getLeverageState();
  const duration = performance.now() - startTime;
  
  console.log(`📊 Leverage State API: ${Math.round(duration)}ms`);
  
  return result.data;
};

// Terminal-style state configuration optimized for all themes
const getStateConfig = (status, colors) => {
  const configs = {
    'Squeeze Risk': {
      color: colors.text.positive,
      bg: colors.bg.tertiary,
      border: colors.border.positive,
      icon: '🟢',
      terminalLabel: '[SHORTS CROWDED]',
      bgClass: 'bg-green-100 dark:bg-green-900/20',
      statusText: 'Shorts Crowded'
    },
    'Balanced': {
      color: colors.text.accent,
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '🟡',
      terminalLabel: '[BALANCED]',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/20',
      statusText: 'Balanced'
    },
    'Flush Risk': {
      color: colors.text.negative,
      bg: colors.bg.tertiary,
      border: colors.border.negative,
      icon: '🔴',
      terminalLabel: '[LONGS CROWDED]',
      bgClass: 'bg-red-100 dark:bg-red-900/20',
      statusText: 'Longs Crowded'
    }
  };

  return configs[status] || configs['Balanced'];
};

// Traffic Light Component with terminal styling
const TrafficLight = React.memo(({ status, colors, size = 'md' }) => {
  const stateConfig = getStateConfig(status, colors);
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
const StatusIndicator = React.memo(({ status, colors }) => {
  const stateConfig = getStateConfig(status, colors);
  
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
const MetricDisplay = React.memo(({ label, value, colors, size = 'normal' }) => {
  const valueSize = size === 'small' ? 'text-sm' : 'text-lg';
  const labelSize = size === 'small' ? 'text-xs' : 'text-xs';
  
  return (
    <div className="text-center">
      <div className={`${valueSize} font-mono ${colors.text.primary}`}>
        {value}
      </div>
      <div className={`${labelSize} ${colors.text.muted} uppercase tracking-wide`}>
        {label}
      </div>
    </div>
  );
});

const StateOfLeverageCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('StateOfLeverageCard');
  
  // Optimized data fetching with intelligent caching
  const { data, isLoading, error } = useQuery({
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
    return getStateConfig(data.status || data.state, colors);
  }, [data, colors]);

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
      </div>

      {/* Main Content - Centered with Better Spacing */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-4">

        {/* Key Metrics - Centered with Improved Typography */}
        <div className="space-y-3 w-full px-4">
          {/* 1) Funding Rate */}
          <div className="flex justify-between items-center">
            <span className={`text-base ${colors.text.muted}`}>• Funding Rate</span>
            <span className={`text-base font-mono font-semibold ${colors.text.primary}`}>
              {data.fundingRate8h !== undefined
                ? `${data.fundingRate8h >= 0 ? '+' : ''}${(data.fundingRate8h * 100).toFixed(4)}%`
                : `${data.fundingRate?.average >= 0 ? '+' : ''}${((data.fundingRate?.average || 0) * 100).toFixed(4)}%`}
            </span>
          </div>

          {/* 2) OI/Marketcap */}
          <div className="flex justify-between items-center">
            <span className={`text-base ${colors.text.muted}`}>• OI/MCap</span>
            <span className={`text-base font-mono font-semibold ${colors.text.primary}`}>
              {data.oiMcapRatio !== undefined
                ? `${data.oiMcapRatio.toFixed(2)}%`
                : `${((data.openInterest?.total || 15) / 1900 * 100).toFixed(2)}%`}
            </span>
          </div>

          {/* 3) OI delta over 7D */}
          <div className="flex justify-between items-center">
            <span className={`text-base ${colors.text.muted}`}>• ΔOI (7D)</span>
            <span className={`text-base font-mono font-semibold ${colors.text.primary}`}>
              {data.oiDelta7d !== undefined
                ? `${data.oiDelta7d >= 0 ? '+' : ''}${data.oiDelta7d.toFixed(1)}%`
                : `${(data.openInterest?.change24h || 0) >= 0 ? '+' : ''}${((data.openInterest?.change24h || 0) * 3.5).toFixed(1)}%`}
            </span>
          </div>

          {/* 4) Status */}
          <div className="flex justify-between items-center">
            <span className={`text-base ${colors.text.muted}`}>• Status</span>
            <div className="flex items-center">
              <span className={`text-sm mr-2 ${stateConfig.color}`}>
                {stateConfig.icon}
              </span>
              <span className={`text-base font-semibold ${stateConfig.color}`}>
                {data.status || data.stateLabel}
              </span>
            </div>
          </div>
        </div>

        {/* GlitchButton Status Indicator */}
        <div className="text-center">
          <GlitchButton
            text={getAnalysisText(data.status || data.state)}
            statusType={
              (data.status || data.state) === 'Squeeze Risk' ? 'easing' :
              (data.status || data.state) === 'Flush Risk' ? 'tightening' : 'neutral'
            }
            size="sm"
          />
        </div>
      </div>

      </div>
  );
});

// Display names for better debugging
TrafficLight.displayName = 'TrafficLight';
StatusIndicator.displayName = 'StatusIndicator';
MetricDisplay.displayName = 'MetricDisplay';
StateOfLeverageCard.displayName = 'StateOfLeverageCard';

export default StateOfLeverageCard;