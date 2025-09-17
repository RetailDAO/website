// Futures Basis Card (Priority 4) - Real Deribit API Integration
import React, { useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { useOptimizedFuturesBasis } from '../../../hooks/useOptimizedFuturesBasis';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';
import GlitchButton from '../../ui/GlitchButton';

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

// Error states for graceful handling with retry functionality
const ErrorState = ({ colors, error, onRetry }) => (
  <div className="h-full flex flex-col items-center justify-center p-4" style={{ minHeight: '280px' }}>
    <div className={`text-center ${colors.text.muted}`}>
      <div className="text-2xl mb-2">⚠️</div>
      <div className="text-sm font-mono uppercase tracking-wider mb-2">[API_ERROR]</div>
      <div className="text-xs mb-3">Futures data temporarily unavailable</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`px-3 py-1 text-xs rounded border ${colors.border.primary} ${colors.text.accent} hover:${colors.bg.tertiary} transition-colors`}
          style={{ borderRadius: '0px' }}
        >
          [RETRY]
        </button>
      )}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs mt-2 opacity-60">{error?.message}</div>
      )}
    </div>
  </div>
);

const LoadingState = ({ colors }) => (
  <div className="h-full flex flex-col animate-pulse">
    <div className="flex justify-between items-center mb-1">
      <div>
        <div className={`h-4 w-28 rounded mb-1 ${colors.bg.tertiary}`}></div>
        <div className={`h-3 w-20 rounded ${colors.bg.tertiary}`}></div>
      </div>
      <div className={`h-5 w-16 rounded ${colors.bg.tertiary}`}></div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className={`h-10 w-28 rounded mb-3 ${colors.bg.tertiary}`}></div>
      <div className={`h-12 w-full rounded mb-3 ${colors.bg.tertiary}`}></div>
      <div className="grid grid-cols-2 gap-3 w-full px-2">
        <div className={`h-6 w-full rounded ${colors.bg.tertiary}`}></div>
        <div className={`h-6 w-full rounded ${colors.bg.tertiary}`}></div>
      </div>
    </div>
  </div>
);

// Terminal-style regime configuration per Kevin's requirements - Theme-aware styling
const getRegimeConfig = (regime, colors) => {
  const configs = {
    'healthy': {
      color: colors.text.positive,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      icon: '🟢',
      terminalLabel: '[HEALTHY]',
      label: 'Healthy',
      description: 'Normal market conditions with healthy premium'
    },
    'backwardation': {
      color: colors.text.negative,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      icon: '🔴',
      terminalLabel: '[STRESS]',
      label: 'Backwardation/Stress',
      description: 'Futures ≤ spot - supply constraints possible'
    },
    'overheated': {
      color: colors.text.negative,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      icon: '🔴',
      terminalLabel: '[OVERHEATED]',
      label: 'Overheated Carry',
      description: 'Excessive premium - potential correction ahead'
    },
    'neutral': {
      color: colors.text.secondary,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      icon: '🟡',
      terminalLabel: '[NORMAL]',
      label: 'Normal',
      description: 'Between healthy and stressed levels'
    }
  };
  
  return configs[regime] || configs['neutral'];
};

const FuturesBasisCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('FuturesBasisCard');
  
  // Get real futures basis data with optimized caching
  const {
    data,
    isLoading,
    isError,
    error,
    spotPrice,
    futuresPrice,
    annualizedBasis,
    regime,
    regimeData,
    daysToExpiry,
    dataSource,
    lastUpdate,
    isUsingMockData,
    refetch
  } = useOptimizedFuturesBasis({
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  // Memoized regime configuration - use regimeData from API if available
  const regimeConfig = useMemo(() => {
    if (regimeData) {
      // Use regime data from API with theme-aware colors
      return {
        ...regimeData,
        color: colors.text[
          regimeData.color === 'green' ? 'positive' :
          regimeData.color === 'red' ? 'negative' : 'secondary'
        ],
        bg: colors.bg.secondary,
        border: colors.border.secondary
      };
    }
    
    // Fallback to local regime config
    return getRegimeConfig(regime, colors);
  }, [regimeData, regime, colors]);

  // Handle loading state
  if (isLoading) {
    return <LoadingState colors={colors} />;
  }

  // Handle error state with retry functionality
  if (isError) {
    return <ErrorState colors={colors} error={error} onRetry={refetch} />;
  }

  return (
      <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [FUTURES_BASIS]
          </h3>
          <p className={`text-xs ${colors.text.secondary} mt-1`}>
            3-Month Premium
          </p>
        </div>
        <div className={`
          px-2 py-1 text-xs font-mono uppercase tracking-wider rounded-lg border
          ${regimeConfig.bg} ${regimeConfig.border}
          ${regimeConfig.color}
        `}>
          <span>{regimeConfig.terminalLabel}</span>
        </div>
      </div>

      {/* Compact Main Content */}
      <div className="flex-1 flex flex-col items-center min-h-0">
        {/* Compact Basis Display */}
        <div className="text-center mb-2">
          <div className={`text-2xl font-bold mb-1 ${colors.text.primary}`}>
            {annualizedBasis > 0 ? '+' : ''}{annualizedBasis.toFixed(2)}%
          </div>
          <div className={`text-xs ${colors.text.secondary}`}>
            Annualized Basis
          </div>
        </div>
        
        {/* Glitch Button Regime Indicator */}
        <div className="mb-2">
          <GlitchButton
            text={regimeConfig.label}
            statusType={regime === 'healthy' ? 'easing' : regime === 'backwardation' || regime === 'overheated' ? 'tightening' : 'neutral'}
            size="sm"
          />
        </div>

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full px-2 mb-2">
          <div className="text-center">
            <div className={`text-sm font-mono ${colors.text.primary}`}>
              ${spotPrice.toLocaleString()}
            </div>
            <div className={`text-xs ${colors.text.muted} uppercase tracking-wide`}>
              Spot Price
            </div>
          </div>
          <div className="text-center">
            <div className={`text-sm font-mono ${colors.text.primary}`}>
              ${futuresPrice.toLocaleString()}
            </div>
            <div className={`text-xs ${colors.text.muted} uppercase tracking-wide`}>
              Futures Price
            </div>
          </div>
        </div>

        {/* Compact Description & Expiry */}
        <div className={`mt-auto p-2 w-full ${colors.bg.tertiary} rounded-lg mb-3`}>
          <div className={`text-xs ${colors.text.primary} text-center mb-1`}>
            {regimeConfig.description}
          </div>
          <div className={`text-xs ${colors.text.muted} text-center`}>
            Expires in {daysToExpiry} days
          </div>
        </div>
      </div>

      {/* Data Source Footer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {data?._fromCache && (
              <span
                className={`font-mono ${data._isStale ? colors.text.accent : colors.text.positive} cursor-help`}
                title={generateTransparencyTooltip({
                  ...extractTransparencyData(data),
                  existingTooltip: data._isStale ? "Showing cached data, updating..." : "Fresh cached data"
                })}
              >
                [{data._isStale ? 'CACHE*' : 'CACHE'}]
              </span>
            )}

            {isLoading && (
              <span className={`font-mono ${colors.text.highlight} animate-pulse`} title="Updating data in background">
                [UPD...]
              </span>
            )}

            {!data?._fromCache && !isLoading && data && (
              <span className={`font-mono ${colors.text.positive}`} title="Live data from server">
                [LIVE]
              </span>
            )}

            {isError && (
              <span className={`font-mono ${colors.text.negative}`} title="Using fallback data">
                [FALLBACK]
              </span>
            )}
          </div>

          <div className={`${colors.text.muted}`}>
            {dataSource || (isUsingMockData ? 'Mock' : 'Deribit')} • {lastUpdate ? formatCacheAge(Date.now() - new Date(lastUpdate).getTime()) : 'Just now'}
          </div>
        </div>
      </div>

      </div>
  );
});

FuturesBasisCard.displayName = 'FuturesBasisCard';

export default FuturesBasisCard;