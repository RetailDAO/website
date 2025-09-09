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
  <div className="h-full flex flex-col p-4 animate-pulse" style={{ minHeight: '280px', maxHeight: '320px' }}>
    <div className="flex justify-between items-center mb-4">
      <div>
        <div className={`h-4 w-32 rounded mb-2 ${colors.bg.tertiary}`}></div>
        <div className={`h-3 w-24 rounded ${colors.bg.tertiary}`}></div>
      </div>
      <div className={`h-6 w-20 rounded ${colors.bg.tertiary}`}></div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className={`h-12 w-32 rounded mb-4 ${colors.bg.tertiary}`}></div>
      <div className={`h-16 w-full rounded mb-4 ${colors.bg.tertiary}`}></div>
      <div className="grid grid-cols-2 gap-4 w-full px-2">
        <div className={`h-8 w-full rounded ${colors.bg.tertiary}`}></div>
        <div className={`h-8 w-full rounded ${colors.bg.tertiary}`}></div>
      </div>
    </div>
  </div>
);

// Terminal-style regime configuration
const getRegimeConfig = (regime, colors) => {
  const configs = {
    'healthy': {
      color: colors.text.positive,
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: '🟢',
      terminalLabel: '[NORMAL]',
      label: 'Healthy Premium',
      description: 'Normal market conditions with healthy premium'
    },
    'danger': {
      color: colors.text.negative,
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '🔴',
      terminalLabel: '[DANGER]',
      label: 'Extreme Premium',
      description: 'Excessive premium - potential correction ahead'
    },
    'caution': {
      color: colors.text.accent,
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: '🟡',
      terminalLabel: '[CAUTION]',
      label: 'Backwardation',
      description: 'Futures below spot - supply constraints possible'
    }
  };
  
  return configs[regime] || configs['healthy'];
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
    <div className="h-full flex flex-col p-4" style={{ minHeight: '280px', maxHeight: '320px' }}>
      {/* Terminal-style header - compact */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className={`text-sm md:text-base font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [FUTURES_BASIS]
          </h3>
          <p className={`text-xs ${colors.text.secondary} mt-1`}>
            3-Month Futures Premium
          </p>
        </div>
        <div className={`
          flex items-center space-x-2 px-3 py-1 text-xs font-mono uppercase tracking-wider
          ${colors.bg.tertiary} ${colors.border.primary} border-0
          ${regimeConfig.color}
        `} style={{borderRadius: '0px'}}>
          <span>{regimeConfig.terminalLabel}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Basis Display */}
        <div className="text-center mb-4">
          <div className={`text-3xl font-bold mb-2 ${colors.text.primary}`}>
            {annualizedBasis > 0 ? '+' : ''}{annualizedBasis.toFixed(2)}%
          </div>
          <div className={`text-xs ${colors.text.secondary}`}>
            Annualized Basis
          </div>
        </div>
        
        {/* Regime Indicator */}
        <div className={`
          px-4 py-2 text-center mb-4 border-2
          ${regimeConfig.bg} ${regimeConfig.border} ${regimeConfig.color}
        `} style={{ borderRadius: '0px' }}>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-lg">{regimeConfig.icon}</span>
            <div>
              <div className="font-semibold text-sm">{regimeConfig.label}</div>
              <div className="text-xs opacity-80">{regimeConfig.description}</div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 w-full px-2">
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

        {/* Expiry Info */}
        <div className={`mt-4 text-xs ${colors.text.muted} text-center`}>
          Expires in {daysToExpiry} days
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