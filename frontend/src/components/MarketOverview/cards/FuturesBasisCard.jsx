// Futures Basis Card (Priority 4) - Placeholder for Market Overview v2
import React, { useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';

// Mock data for now - will be replaced with real Deribit API integration
const generateMockFuturesData = () => ({
  spotPrice: 67234 + (Math.random() - 0.5) * 1000,
  futuresPrice: 68500 + (Math.random() - 0.5) * 1500,
  daysToExpiry: 89 + Math.floor(Math.random() * 5),
  annualizedBasis: 8.2 + (Math.random() - 0.5) * 4,
  regime: Math.random() > 0.7 ? 'danger' : Math.random() > 0.3 ? 'healthy' : 'caution',
  timestamp: Date.now()
});

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
  
  // Generate mock data
  const data = useMemo(() => generateMockFuturesData(), []);
  
  // Memoized regime configuration
  const regimeConfig = useMemo(() => {
    return getRegimeConfig(data.regime, colors);
  }, [data.regime, colors]);

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
            {data.annualizedBasis > 0 ? '+' : ''}{data.annualizedBasis.toFixed(2)}%
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
              ${data.spotPrice.toLocaleString()}
            </div>
            <div className={`text-xs ${colors.text.muted} uppercase tracking-wide`}>
              Spot Price
            </div>
          </div>
          <div className="text-center">
            <div className={`text-sm font-mono ${colors.text.primary}`}>
              ${data.futuresPrice.toLocaleString()}
            </div>
            <div className={`text-xs ${colors.text.muted} uppercase tracking-wide`}>
              Futures Price
            </div>
          </div>
        </div>

        {/* Expiry Info */}
        <div className={`mt-4 text-xs ${colors.text.muted} text-center`}>
          Expires in {data.daysToExpiry} days
        </div>
      </div>

      {/* Footer with metadata - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`mt-2 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          🎭 Mock data • {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

FuturesBasisCard.displayName = 'FuturesBasisCard';

export default FuturesBasisCard;