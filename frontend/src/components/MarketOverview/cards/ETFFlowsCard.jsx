// ETF Flows Card (Priority 6) - Placeholder for Market Overview v2
import React, { useMemo, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';

// Mock data for now - will be replaced with real ETF API integration
const generateMockETFData = (period) => {
  const days = period === '2W' ? 14 : 30;
  const flows = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const inflow = (Math.random() - 0.4) * 2000; // -800 to +1200M range
    flows.push({
      date: date.toISOString().split('T')[0],
      inflow: Math.round(inflow),
      cumulative: flows.length > 0 ? flows[flows.length - 1].cumulative + inflow : inflow
    });
  }
  
  const inflow5D = flows.slice(-5).reduce((sum, day) => sum + day.inflow, 0);
  const status = inflow5D > 1000 ? 'strong-inflows' : inflow5D > 0 ? 'positive' : 'negative';
  
  return {
    period,
    flows,
    inflow5D: Math.round(inflow5D),
    status,
    timestamp: Date.now()
  };
};

// Terminal-style status configuration
const getStatusConfig = (status, colors) => {
  const configs = {
    'strong-inflows': {
      color: colors.text.positive,
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      terminalLabel: '[STRONG]',
      label: 'Strong Inflows',
      icon: '🔥'
    },
    'positive': {
      color: colors.text.positive,
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      terminalLabel: '[POSITIVE]',
      label: 'Net Inflows',
      icon: '📈'
    },
    'negative': {
      color: colors.text.negative,
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      terminalLabel: '[OUTFLOWS]',
      label: 'Net Outflows',
      icon: '📉'
    }
  };
  
  return configs[status] || configs['positive'];
};

// Simple bar chart component
const SimpleBarChart = React.memo(({ flows, colors }) => {
  if (!flows || flows.length === 0) return null;
  
  const maxAbs = Math.max(...flows.map(f => Math.abs(f.inflow)));
  const barWidth = Math.max(2, 80 / flows.length);
  
  return (
    <div className="w-full h-16 flex items-end justify-center space-x-0.5 px-2">
      {flows.slice(-10).map((flow, index) => {
        const height = Math.max(2, Math.abs(flow.inflow) / maxAbs * 50);
        const isPositive = flow.inflow >= 0;
        
        return (
          <div
            key={index}
            className={`
              ${isPositive ? colors.bg.positive?.replace('bg-', '') || 'bg-green-500' : colors.bg.negative?.replace('bg-', '') || 'bg-red-500'}
              opacity-80 hover:opacity-100 transition-opacity duration-200
            `}
            style={{
              width: `${barWidth}px`,
              height: `${height}px`,
              minHeight: '2px'
            }}
            title={`${flow.date}: $${flow.inflow}M`}
          />
        );
      })}
    </div>
  );
});

const ETFFlowsCard = React.memo(() => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState('2W');
  
  // Performance tracking
  usePerformanceTracking('ETFFlowsCard');
  
  // Generate mock data
  const data = useMemo(() => generateMockETFData(period), [period]);
  
  // Memoized status configuration
  const statusConfig = useMemo(() => {
    return getStatusConfig(data.status, colors);
  }, [data.status, colors]);

  return (
    <div className="h-full flex flex-col p-4" style={{ minHeight: '280px', maxHeight: '320px' }}>
      {/* Terminal-style header with period selector - compact */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className={`text-sm md:text-base font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [ETF_FLOWS]
          </h3>
          <p className={`text-xs ${colors.text.secondary} mt-1`}>
            Bitcoin ETF Daily Flows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Period Selector */}
          <div className="flex border border-gray-600 rounded-none overflow-hidden">
            {['2W', '1M'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-2 py-1 text-xs font-mono
                  ${period === p 
                    ? `${colors.text.primary} ${colors.bg.secondary}` 
                    : `${colors.text.muted} hover:${colors.text.secondary}`
                  }
                  transition-colors duration-200
                `}
              >
                {p}
              </button>
            ))}
          </div>
          <div className={`
            flex items-center space-x-2 px-2 py-1 text-xs font-mono uppercase tracking-wider
            ${colors.bg.tertiary} ${colors.border.primary} border-0
            ${statusConfig.color}
          `} style={{borderRadius: '0px'}}>
            <span>{statusConfig.terminalLabel}</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 flex flex-col justify-center">
        <SimpleBarChart flows={data.flows} colors={colors} />
      </div>

      {/* Stats Section */}
      <div className="mt-4">
        {/* 5D Inflow Display */}
        <div className="text-center mb-3">
          <div className={`text-xl font-bold ${data.inflow5D >= 0 ? colors.text.positive : colors.text.negative}`}>
            {data.inflow5D > 0 ? '+' : ''}${data.inflow5D.toLocaleString()}M
          </div>
          <div className={`text-xs ${colors.text.secondary}`}>
            5-Day Net Flows
          </div>
        </div>

        {/* Status Badge */}
        <div className={`
          px-3 py-2 text-center border
          ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}
        `} style={{ borderRadius: '0px' }}>
          <div className="flex items-center justify-center space-x-2">
            <span>{statusConfig.icon}</span>
            <span className="text-sm font-semibold">{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Footer with metadata - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`mt-2 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          🎭 Mock data ({period}) • {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

SimpleBarChart.displayName = 'SimpleBarChart';
ETFFlowsCard.displayName = 'ETFFlowsCard';

export default ETFFlowsCard;