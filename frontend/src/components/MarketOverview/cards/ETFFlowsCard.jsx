// ETF Flows Card (Priority 6) - Real data integration for Market Overview v2
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import apiService from '../../../services/api';

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
  const status = inflow5D > 1500 ? 'sustained-inflows' : inflow5D < -750 ? 'sustained-outflows' : 'mixed';
  
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
    'sustained-inflows': {
      color: colors.text.positive,
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      terminalLabel: '[SUSTAINED+]',
      label: 'Sustained Inflows',
      description: '>1.5B',
      icon: '🔥'
    },
    'sustained-outflows': {
      color: colors.text.negative,
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      terminalLabel: '[SUSTAINED-]',
      label: 'Sustained Outflows',
      description: '<-750M',
      icon: '📉'
    },
    'mixed': {
      color: colors.text.warning,
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      terminalLabel: '[MIXED]',
      label: 'Mixed',
      description: 'Between -750M & 1.5B',
      icon: '⚖️'
    }
  };
  
  return configs[status] || configs['mixed'];
};

// Enhanced bar chart component for ETF flows
const ETFFlowChart = React.memo(({ flows, colors, period }) => {
  if (!flows || flows.length === 0) return null;
  
  const maxAbs = Math.max(...flows.map(f => Math.abs(f.inflow)));
  const displayFlows = flows; // Show all flows for the selected period
  const barWidth = Math.max(1.5, Math.min(8, 280 / displayFlows.length));
  
  return (
    <div className="w-full h-24 flex flex-col">
      {/* Chart container */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Zero line */}
        <div className={`absolute w-full h-px ${colors.border.primary} opacity-30`} style={{ top: '50%' }} />
        
        {/* Bars */}
        <div className="flex items-center justify-center space-x-0.5 h-full">
          {displayFlows.map((flow, index) => {
            const height = Math.max(2, Math.abs(flow.inflow) / maxAbs * 35);
            const isPositive = flow.inflow >= 0;
            
            return (
              <div
                key={index}
                className="flex flex-col items-center justify-center h-full"
                title={`${new Date(flow.date).toLocaleDateString()}: ${flow.inflow > 0 ? '+' : ''}$${flow.inflow.toLocaleString()}M`}
              >
                <div
                  className={`
                    ${isPositive 
                      ? 'bg-green-500 dark:bg-green-400' 
                      : 'bg-red-500 dark:bg-red-400'
                    }
                    opacity-75 hover:opacity-100 transition-all duration-200
                    hover:scale-110 cursor-pointer
                  `}
                  style={{
                    width: `${barWidth}px`,
                    height: `${height}px`,
                    marginTop: isPositive ? 'auto' : '0',
                    marginBottom: isPositive ? '0' : 'auto'
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mini timeline labels */}
      <div className="flex justify-between mt-1 px-2">
        <span className={`text-xs ${colors.text.muted}`}>
          {period === '2W' ? '2 weeks ago' : '1 month ago'}
        </span>
        <span className={`text-xs ${colors.text.muted}`}>
          Today
        </span>
      </div>
    </div>
  );
});

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

const ETFFlowsCard = React.memo(() => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState('2W');
  
  // Performance tracking
  usePerformanceTracking('ETFFlowsCard');
  
  // Cache-first data loading - display cached data immediately without API calls
  const { data: apiResponse, isLoading, error, isFetching } = useQuery({
    queryKey: ['etf-flows', period],
    queryFn: () => apiService.getETFFlows(period),
    staleTime: Infinity, // Never consider cached data stale - true cache-first
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry on mount, only background refresh
    networkMode: 'offlineFirst',
    // This ensures we immediately return cached data if available
    initialDataUpdatedAt: 0
  });

  // Extract data from API response with cache age calculation
  const data = useMemo(() => {
    if (apiResponse?.success && apiResponse?.data) {
      const dataTimestamp = apiResponse.data.metadata?.timestamp || apiResponse.data.timestamp || Date.now();
      const cacheAge = Date.now() - dataTimestamp;
      
      return {
        flows: apiResponse.data.flows || [],
        inflow5D: apiResponse.data.inflow5D || 0,
        status: apiResponse.data.status || 'mixed',
        terminalLabel: apiResponse.data.terminalLabel || '[MIXED]',
        description: apiResponse.data.description || 'ETF flows analysis',
        etfsAnalyzed: apiResponse.data.etfsAnalyzed || 5,
        etfBreakdown: apiResponse.data.etfBreakdown || [],
        metadata: apiResponse.data.metadata || {},
        _fromCache: apiResponse._fromCache,
        _isStale: apiResponse._isStale,
        timestamp: dataTimestamp,
        cacheAge: cacheAge,
        cacheAgeFormatted: formatCacheAge(cacheAge)
      };
    }
    // Fallback to mock data if no cached data available
    return {
      ...generateMockETFData(period),
      _fromCache: false,
      cacheAge: 0,
      cacheAgeFormatted: 'Just now'
    };
  }, [apiResponse, period]);
  
  // Memoized status configuration
  const statusConfig = useMemo(() => {
    return getStatusConfig(data.status, colors);
  }, [data.status, colors]);

  // Loading state - only show for initial load with no cached data
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${colors.border.primary} mx-auto mb-2`}></div>
            <div className={`text-sm ${colors.text.secondary}`}>Loading ETF flows...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart First - Highest Hierarchy */}
      <div className="flex-1 mb-3">
        <ETFFlowChart flows={data.flows} colors={colors} period={period} />
      </div>

      {/* Header - Second Hierarchy */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [ETF_FLOWS]
          </h3>
          <p className={`text-xs ${colors.text.secondary} mt-1`}>
            Bitcoin ETF Daily Net Flows
          </p>
        </div>
        <div className="flex items-center space-x-1">
          {/* Period Selector */}
          <div className="flex border border-gray-600 rounded overflow-hidden">
            {['2W', '1M'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-1.5 py-0.5 text-xs font-mono
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
            px-2 py-1 text-xs font-mono uppercase tracking-wider
            ${colors.bg.tertiary} ${colors.border.primary} border-0
            ${statusConfig.color}
          `} style={{borderRadius: '0px'}}>
            <span>{statusConfig.terminalLabel}</span>
          </div>
        </div>
      </div>

      {/* Stats and Status - Third Hierarchy */}
      <div className="space-y-2">
        {/* 5D Net Display */}
        <div className="text-center">
          <div className="flex items-baseline justify-center space-x-1">
            <span className={`text-xs ${colors.text.secondary}`}>5D Net:</span>
            <div className={`text-lg font-bold ${
              data.inflow5D > 1500 ? colors.text.positive :
              data.inflow5D < -750 ? colors.text.negative :
              colors.text.warning
            }`}>
              {data.inflow5D > 0 ? '+' : ''}${data.inflow5D.toLocaleString()}M
            </div>
            <span className={`text-xs ${colors.text.secondary}`}>
              {statusConfig.label} ({statusConfig.description})
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`
          px-2 py-1 text-center border
          ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}
        `} style={{ borderRadius: '0px' }}>
          <div className="flex items-center justify-center space-x-1">
            <span>{statusConfig.icon}</span>
            <div className="text-xs font-semibold">{statusConfig.label}</div>
          </div>
        </div>

        {/* Data Source and Status */}
        <div className="space-y-1">
          {/* Cache/Fetching Status Indicators */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {data._fromCache && (
                <span 
                  className={`font-mono ${data._isStale ? colors.text.accent : colors.text.positive}`} 
                  title={data._isStale ? "Showing cached data, updating..." : "Fresh cached data"}
                >
                  [{data._isStale ? 'CACHE*' : 'CACHE'}]
                </span>
              )}
              
              {isFetching && (
                <span className={`font-mono ${colors.text.highlight} animate-pulse`} title="Updating data in background">
                  [UPD...]
                </span>
              )}
              
              {!data._fromCache && !isFetching && apiResponse?.success && (
                <span className={`font-mono ${colors.text.positive}`} title="Live data from server">
                  [LIVE]
                </span>
              )}
              
              {error && (
                <span className={`font-mono ${colors.text.negative}`} title="Using fallback data">
                  [FALLBACK]
                </span>
              )}
            </div>
            
            <div className={`${colors.text.muted}`}>
              {data.etfsAnalyzed} ETFs • {data.cacheAgeFormatted}
            </div>
          </div>
          
          {/* Data Source Disclaimer */}
          <div className={`text-xs ${colors.text.muted} text-center px-2 py-1 ${colors.bg.tertiary} border-t ${colors.border.primary}`}>
            <div className="mb-1">
              <strong>Data Source:</strong> {apiResponse?.success ? 'Yahoo Finance ETF Data' : 'Mock ETF data simulating major Bitcoin ETFs'}
            </div>
            <div className="mb-1">
              <strong>ETFs Included:</strong> {data.etfBreakdown?.map(etf => etf.symbol).join(', ') || 'GBTC, BITB, ARKB, BTCO, HODL, BRRR, IBIT, FBTC'}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ETFFlowChart.displayName = 'ETFFlowChart';
ETFFlowsCard.displayName = 'ETFFlowsCard';

export default ETFFlowsCard;