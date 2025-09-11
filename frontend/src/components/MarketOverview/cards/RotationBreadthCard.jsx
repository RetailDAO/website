// Rotation Breadth Card (Priority 5) - Placeholder for Market Overview v2
import React, { useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';

// Mock data for now - will be replaced with real CoinGecko API integration
const generateMockRotationData = () => {
  const percentage = 35 + Math.random() * 40; // 35-75% range
  const topPerformers = [
    { symbol: 'SOL', performance: '+18.2' },
    { symbol: 'AVAX', performance: '+15.7' },
    { symbol: 'MATIC', performance: '+12.3' },
    { symbol: 'LINK', performance: '+8.9' }
  ];
  
  return {
    percentage: Math.round(percentage * 10) / 10,
    category: percentage < 40 ? 'btc-season' : percentage < 60 ? 'neutral' : 'alt-season',
    topPerformers,
    totalAnalyzed: 97,
    timestamp: Date.now()
  };
};

// Terminal-style category configuration
const getCategoryConfig = (category, colors) => {
  const configs = {
    'btc-season': {
      color: colors.text.accent,
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      terminalLabel: '[BTC_SEASON]',
      label: 'BTC Season',
      description: 'Bitcoin dominance strong'
    },
    'neutral': {
      color: colors.text.secondary,
      bg: 'bg-gray-100 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      terminalLabel: '[BALANCED]',
      label: 'Balanced',
      description: 'Mixed market conditions'
    },
    'alt-season': {
      color: colors.text.positive,
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      terminalLabel: '[ALT_SEASON]',
      label: 'Alt Season',
      description: 'Altcoins outperforming'
    }
  };
  
  return configs[category] || configs['neutral'];
};

// Simple gauge component
const SimpleGauge = React.memo(({ percentage, config, colors }) => {
  const gaugeAngle = (percentage / 100) * 180; // 0-180 degrees
  
  return (
    <div className="relative w-20 h-10 mx-auto">
      <svg width="80" height="40" className="transform">
        {/* Background arc */}
        <path
          d="M 6 32 A 26 26 0 0 1 74 32"
          fill="none"
          stroke={colors.border.secondary.replace('border-', '#')}
          strokeWidth="3"
        />
        {/* Progress arc */}
        <path
          d="M 6 32 A 26 26 0 0 1 74 32"
          fill="none"
          stroke={config.color.replace('text-', '#')}
          strokeWidth="3"
          strokeDasharray={`${(percentage / 100) * 82} 82`}
          className="transition-all duration-500"
        />
        {/* Pointer */}
        <circle
          cx={40 + 26 * Math.cos((180 - gaugeAngle) * Math.PI / 180)}
          cy={32 - 26 * Math.sin((180 - gaugeAngle) * Math.PI / 180)}
          r="2"
          fill={config.color.replace('text-', '#')}
          className="transition-all duration-500"
        />
      </svg>
    </div>
  );
});

const RotationBreadthCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('RotationBreadthCard');
  
  // Generate mock data
  const data = useMemo(() => generateMockRotationData(), []);
  
  // Memoized category configuration
  const categoryConfig = useMemo(() => {
    return getCategoryConfig(data.category, colors);
  }, [data.category, colors]);

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [ROTATION_BREADTH]
          </h3>
          <p className={`text-xs ${colors.text.secondary} mt-1`}>
            {data.totalAnalyzed} Coins vs BTC
          </p>
        </div>
        <div className={`
          px-2 py-1 text-xs font-mono uppercase tracking-wider
          ${colors.bg.tertiary} ${colors.border.primary} border-0
          ${categoryConfig.color}
        `} style={{borderRadius: '0px'}}>
          <span>{categoryConfig.terminalLabel}</span>
        </div>
      </div>

      {/* Compact Main Content */}
      <div className="flex-1 flex flex-col items-center min-h-0">
        {/* Smaller Gauge Display */}
        <div className="mb-1">
          <SimpleGauge percentage={data.percentage} config={categoryConfig} colors={colors} />
        </div>
        
        {/* Compact Percentage Display */}
        <div className="text-center mb-2">
          <div className={`text-xl font-bold ${colors.text.primary}`}>
            {data.percentage}%
          </div>
          <div className={`text-xs ${colors.text.secondary}`}>
            Beating BTC (30D)
          </div>
        </div>

        {/* Compact Category Badge */}
        <div className={`
          px-2 py-1 text-center mb-2 border
          ${categoryConfig.bg} ${categoryConfig.border} ${categoryConfig.color}
        `} style={{ borderRadius: '0px' }}>
          <div className="text-xs font-semibold">{categoryConfig.label}</div>
        </div>

        {/* Compact Top Performers */}
        <div className="w-full mt-auto">
          <div className={`text-xs ${colors.text.muted} uppercase tracking-wide mb-1 text-center`}>
            Top Performers
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {data.topPerformers.slice(0, 4).map((coin) => (
              <div key={coin.symbol} className="flex justify-between items-center px-1 py-0.5">
                <span className={`font-mono ${colors.text.secondary}`}>{coin.symbol}</span>
                <span className={`font-mono ${colors.text.positive}`}>{coin.performance}%</span>
              </div>
            ))}
          </div>
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

SimpleGauge.displayName = 'SimpleGauge';
RotationBreadthCard.displayName = 'RotationBreadthCard';

export default RotationBreadthCard;