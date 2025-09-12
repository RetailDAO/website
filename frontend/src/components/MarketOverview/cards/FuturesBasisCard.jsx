// Futures Basis Card (Priority 4) - Real Deribit API Integration
import React, { useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { useOptimizedFuturesBasis } from '../../../hooks/useOptimizedFuturesBasis';

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
    <div className="flex justify-between items-center mb-2">
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

// Terminal-style regime configuration per Kevin's requirements
const getRegimeConfig = (regime, colors) => {
  const configs = {
    'healthy': {
      color: colors.text.positive,
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: '🟢',
      terminalLabel: '[HEALTHY]',
      label: 'Healthy Contango',
      description: 'Normal market conditions with healthy premium'
    },
    'backwardation': {
      color: colors.text.negative,
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '🔴',
      terminalLabel: '[STRESS]',
      label: 'Backwardation/Stress',
      description: 'Futures ≤ spot - supply constraints possible'
    },
    'overheated': {
      color: colors.text.negative,
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '🔴',
      terminalLabel: '[OVERHEATED]',
      label: 'Overheated Carry',
      description: 'Excessive premium - potential correction ahead'
    },
    'neutral': {
      color: colors.text.accent,
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: '🟡',
      terminalLabel: '[NEUTRAL]',
      label: 'Neutral',
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
      // Use regime data from API
      return {
        ...regimeData,
        color: colors.text[
          regimeData.color === 'green' ? 'positive' :
          regimeData.color === 'red' ? 'negative' : 'accent'
        ],
        bg: regimeData.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
           regimeData.color === 'red' ? 'bg-red-100 dark:bg-red-900/20' :
           'bg-yellow-100 dark:bg-yellow-900/20',
        border: regimeData.color === 'green' ? 'border-green-200 dark:border-green-800' :
                regimeData.color === 'red' ? 'border-red-200 dark:border-red-800' :
                'border-yellow-200 dark:border-yellow-800'
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
        
        {/* Compact Regime Indicator */}
        <div className={`
          px-3 py-2 text-center mb-3 border rounded-lg
          ${regimeConfig.bg} ${regimeConfig.border} ${regimeConfig.color}
        `}>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-sm">{regimeConfig.icon}</span>
            <div>
              <div className="font-semibold text-xs">{regimeConfig.label}</div>
            </div>
          </div>
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
        <div className={`mt-auto p-2 w-full ${colors.bg.tertiary} rounded-lg`}>
          <div className={`text-xs ${colors.text.primary} text-center mb-1`}>
            {regimeConfig.description}
          </div>
          <div className={`text-xs ${colors.text.muted} text-center`}>
            Expires in {daysToExpiry} days
          </div>
        </div>
      </div>

      {/* Footer with metadata - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`mt-2 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          {isUsingMockData() ? '🎭' : '✅'} {dataSource} • {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'No timestamp'}
          {data?._metadata?.fetchTime && (
            <span className="ml-2">• {data._metadata.fetchTime}ms</span>
          )}
        </div>
      )}
    </div>
  );
});

FuturesBasisCard.displayName = 'FuturesBasisCard';

export default FuturesBasisCard;