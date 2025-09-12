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

// Terminal-style status configuration - Enhanced for API data
const getStatusConfig = (status, colors, statusColor = null) => {
  // Map API status to local config, with theme-aware colors
  const configs = {
    'Sustained Inflows': {
      color: colors.text.positive,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[STRONG]',
      label: 'Sustained Inflows',
      description: 'Strong institutional buying',
      icon: '🔥'
    },
    'Positive Flows': {
      color: colors.text.positive,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[POSITIVE]',
      label: 'Positive Flows',
      description: 'Healthy accumulation',
      icon: '📈'
    },
    'Sustained Outflows': {
      color: colors.text.negative,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[OUTFLOWS]',
      label: 'Sustained Outflows',
      description: 'Heavy institutional selling',
      icon: '📉'
    },
    'Negative Flows': {
      color: colors.text.negative,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[WEAK]',
      label: 'Negative Flows',
      description: 'Institutional caution',
      icon: '⚠️'
    },
    'Mixed': {
      color: colors.text.secondary,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[MIXED]',
      label: 'Mixed',
      description: 'Balanced flows',
      icon: '⚖️'
    }
  };
  
  // Use API status or fallback to mixed
  const config = configs[status] || configs['Mixed'];
  
  // Override color if statusColor provided from API
  if (statusColor) {
    if (statusColor === 'green') config.color = colors.text.positive;
    else if (statusColor === 'red') config.color = colors.text.negative;
    else if (statusColor === 'yellow' || statusColor === 'orange') config.color = colors.text.secondary;
  }
  
  return config;
};

// Enhanced bar chart component for ETF flows - Optimized for real API data
const ETFFlowChart = React.memo(({ flows, colors, period }) => {
  if (!flows || flows.length === 0) return (
    <div className="w-full h-40 flex items-center justify-center">
      <span className={`text-sm ${colors.text.secondary}`}>No flow data available</span>
    </div>
  );
  
  const maxInflow = Math.max(...flows.map(f => f.inflow), 0);
  const minInflow = Math.min(...flows.map(f => f.inflow), 0);
  const maxAbs = Math.max(Math.abs(maxInflow), Math.abs(minInflow));
  const displayFlows = flows; // Show all flows for the selected period
  const barWidth = Math.max(2, Math.min(10, 280 / displayFlows.length));
  
  // Check if all flows are positive (typical for net inflows)
  const allPositive = flows.every(f => f.inflow >= 0);
  
  return (
    <div className="w-full h-40 flex flex-col">
      {/* Chart container */}
      <div className="flex-1 flex items-center justify-center relative">
        {!allPositive && (
          // Zero line at center - only show if we have negative flows
          <div className={`absolute w-full h-px ${colors.border.primary} opacity-50 z-10`} style={{ top: '50%' }} />
        )}
        
        {/* Bars container */}
        <div className="flex items-center justify-center space-x-0.5 h-full relative">
          {displayFlows.map((flow, index) => {
            const maxHeight = allPositive ? 120 : 70; // Use full height if all positive
            const normalizedValue = Math.abs(flow.inflow) / maxAbs;
            const height = Math.max(4, normalizedValue * maxHeight);
            const isPositive = flow.inflow >= 0;
            
            return (
              <div
                key={index}
                className="relative flex items-center"
                style={{ height: '100%' }}
                title={`${new Date(flow.date).toLocaleDateString()}: $${flow.inflow.toLocaleString()}M • ${flow.etfsContributing || 'Multiple'} ETFs`}
              >
                <div
                  className={`
                    ${isPositive 
                      ? 'bg-green-500 dark:bg-green-400' 
                      : 'bg-red-500 dark:bg-red-400'
                    }
                    opacity-80 hover:opacity-100 transition-all duration-200
                    hover:scale-105 cursor-pointer rounded-sm
                    absolute
                  `}
                  style={{
                    width: `${barWidth}px`,
                    height: `${height}px`,
                    // Position bars properly based on data type
                    bottom: allPositive ? '8px' : (isPositive ? '50%' : `calc(50% - ${height}px)`),
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Flow value labels for recent days */}
        {displayFlows.length <= 14 && (
          <div className="absolute top-0 left-0 right-0 flex justify-between px-2 text-xs">
            {displayFlows.slice(-5).map((flow, index) => (
              <span key={index} className={`${colors.text.muted} opacity-60`}>
                ${Math.round(flow.inflow)}M
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Enhanced timeline labels */}
      <div className="flex justify-between mt-2 px-2">
        <span className={`text-xs ${colors.text.muted}`}>
          {period === '2W' ? '2 weeks ago' : '1 month ago'}
        </span>
        <span className={`text-xs ${colors.text.accent}`}>
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
      
      // Transform API flows data for proper chart rendering
      const transformedFlows = (apiResponse.data.flows || []).map(flow => ({
        date: flow.date,
        inflow: flow.inflow || flow.netFlow || flow.flow || 0, // Handle different API response formats
        cumulative: flow.cumulative || 0,
        etfsContributing: flow.etfsContributing || flow.etfBreakdown?.length || 5
      }));
      
      return {
        flows: transformedFlows,
        inflow5D: apiResponse.data.inflow5D || 0,
        status: apiResponse.data.status || 'mixed',
        statusColor: apiResponse.data.statusColor || 'yellow',
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
  
  // Memoized status configuration with API color support
  const statusConfig = useMemo(() => {
    return getStatusConfig(data.status, colors, data.statusColor);
  }, [data.status, data.statusColor, colors]);

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
      {/* Header - First Hierarchy - Moved to top */}
      <div className="flex justify-between items-center mb-3">
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
          <div className={`flex border ${colors.border.primary} rounded-lg overflow-hidden`}>
            {['2W', '1M'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-2 py-1 text-xs font-mono
                  ${period === p 
                    ? `${colors.text.primary} ${colors.bg.tertiary}` 
                    : `${colors.text.muted} hover:${colors.text.secondary} hover:${colors.bg.hover}`
                  }
                  transition-colors duration-200
                `}
              >
                {p}
              </button>
            ))}
          </div>
          <div className={`
            px-2 py-1 text-xs font-mono uppercase tracking-wider rounded-lg border
            ${statusConfig.bg} ${statusConfig.border}
            ${statusConfig.color}
          `}>
            <span>{statusConfig.terminalLabel}</span>
          </div>
        </div>
      </div>

      {/* Chart - Second Hierarchy - Increased size */}
      <div className="mb-3">
        <ETFFlowChart flows={data.flows} colors={colors} period={period} />
      </div>

      {/* Stats and Status - Third Hierarchy */}
      <div className="space-y-2">
        {/* 5D Net Display with integrated status */}
        <div className="text-center">
          <div className="flex items-baseline justify-center space-x-2 mb-1">
            <span className={`text-xs ${colors.text.secondary}`}>5D Net:</span>
            <div className={`text-xl font-bold ${
              data.inflow5D > 1500 ? colors.text.positive :
              data.inflow5D < -750 ? colors.text.negative :
              colors.text.warning
            }`}>
              {data.inflow5D > 0 ? '+' : ''}${data.inflow5D.toLocaleString()}M
            </div>
            <span className={`text-xs ${statusConfig.color} font-medium`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
          <div className={`text-xs ${colors.text.secondary}`}>
            {statusConfig.description}
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
            
            <div 
              className={`${colors.text.muted} cursor-help hover:${colors.text.secondary} transition-colors`}
              title={`Data Source: ${data.metadata?.dataSource === 'yahoo_finance' ? 'Yahoo Finance ETF Data' : 'Mock ETF data simulating major Bitcoin ETFs'} | ETFs Included: ${data.etfBreakdown?.map(etf => `${etf.symbol} (${etf.name})`).join(', ') || 'IBIT (BlackRock), FBTC (Fidelity), GBTC (Grayscale), BITB (Bitwise), ARKB (ARK)'} | Total 5D Flow: $${data.inflow5D?.toLocaleString()}M | Last Updated: ${new Date(data.timestamp).toLocaleString()}`}
            >
              {data.etfsAnalyzed} ETFs • {data.cacheAgeFormatted}
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