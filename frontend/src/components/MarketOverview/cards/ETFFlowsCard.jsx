// ETF Flows Card (Priority 6) - Real data integration for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import apiService from '../../../services/api';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';


// Get ETF status based on 5D net flows - Updated to match backend logic
const getETFStatus = (inflow5D) => {
  if (inflow5D > 500) return 'STRONG';
  if (inflow5D > 50) return 'POSITIVE';
  if (inflow5D > -50) return 'MIXED';
  if (inflow5D > -200) return 'WEAK';
  return 'OUTFLOWS';
};

// Terminal-style status configuration - Updated for Kevin's requirements
const getStatusConfig = (inflow5D, colors) => {
  const status = getETFStatus(inflow5D);

  const configs = {
    'STRONG': {
      color: colors.text.positive,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[STRONG]',
      label: 'Strong Inflows',
      description: 'Strong institutional buying pressure',
      icon: '🔥'
    },
    'POSITIVE': {
      color: colors.text.positive,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[POSITIVE]',
      label: 'Positive Flows',
      description: 'Moderate institutional accumulation',
      icon: '📈'
    },
    'MIXED': {
      color: colors.text.secondary,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[MIXED]',
      label: 'Mixed',
      description: 'Balanced institutional sentiment',
      icon: '⚖️'
    },
    'WEAK': {
      color: colors.text.accent,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[WEAK]',
      label: 'Negative Flows',
      description: 'Moderate institutional caution',
      icon: '📉'
    },
    'OUTFLOWS': {
      color: colors.text.negative,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[OUTFLOWS]',
      label: 'Sustained Outflows',
      description: 'Heavy institutional selling pressure',
      icon: '🔻'
    }
  };

  return configs[status];
};

// Professional ETF flows chart matching CoinGlass style
const ETFFlowChart = React.memo(({ flows }) => {
  if (!flows || flows.length === 0) return (
    <div className="w-full h-40 flex items-center justify-center bg-gray-900 rounded-lg">
      <span className="text-sm text-gray-400">No flow data available</span>
    </div>
  );

  // Filter out today's date to show only past days (up to yesterday)
  const today = new Date().toISOString().split('T')[0];
  const displayFlows = flows.filter(flow => flow.date !== today);
  const totalBars = displayFlows.length;

  // Responsive chart dimensions
  const chartHeight = 120;
  const baseChartWidth = 360;
  const minChartWidth = 280; // Minimum width for mobile

  // Dynamic scale based on actual data for better visibility
  const maxInflow = Math.max(...displayFlows.map(f => Math.abs(f.inflow || 0)));
  const minInflow = Math.min(...displayFlows.map(f => f.inflow || 0));
  const maxValue = Math.max(maxInflow, Math.abs(minInflow));

  // Professional scale with appropriate padding for visibility
  const scalePadding = maxValue * 0.25; // 25% padding for better visual clarity
  const scaleMax = maxValue + scalePadding;
  const scaleMin = -(maxValue + scalePadding);
  const totalRange = scaleMax - scaleMin;
  const zeroLinePosition = Math.abs(scaleMin) / totalRange;

  // Responsive bar width calculation
  const availableWidth = Math.max(minChartWidth, baseChartWidth);
  const barWidth = Math.max(6, Math.min(12, Math.floor(availableWidth / (totalBars * 1.5)))); // Responsive bar width
  const barSpacing = Math.max(1, Math.floor((availableWidth - (totalBars * barWidth)) / Math.max(1, totalBars - 1)));

  return (
    <div className="w-full h-44 flex flex-col">
      {/* Professional chart container with responsive overflow */}
      <div className="flex-1 relative bg-transparent rounded-lg p-4 overflow-x-auto overflow-y-hidden">
        <div style={{ minWidth: `${availableWidth + 50}px`, height: `${chartHeight}px`, position: 'relative' }}>
          {/* Y-axis labels */}
          <div className="absolute left-1 top-2 bottom-8 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
            <span>+{formatFlowValue(scaleMax).replace('+', '')}</span>
            <span>0</span>
            <span>{formatFlowValue(scaleMin)}</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 mr-2 relative" style={{ height: `${chartHeight}px` }}>
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {/* Top line */}
            <div className="w-full h-px bg-gray-400 dark:bg-gray-600 opacity-40"></div>
            {/* Zero line */}
            <div className="w-full h-px bg-gray-600 dark:bg-gray-400 opacity-60"></div>
            {/* Bottom line */}
            <div className="w-full h-px bg-gray-400 dark:bg-gray-600 opacity-40"></div>
          </div>

            {/* Bars container */}
            <div className="absolute inset-0 flex items-end justify-start pt-2 pb-6">
            {displayFlows.map((flow, index) => {
              const flowValue = flow.inflow || flow.netFlow || flow.flow || 0;
              const isPositive = flowValue >= 0;

              // Calculate bar position and height with fixed scale
              const valueRatio = Math.abs(flowValue) / totalRange;
              const barHeight = Math.max(1, valueRatio * (chartHeight - 24));

              // Position from bottom for negative, from zero line for positive
              let barBottom;
              if (isPositive) {
                barBottom = zeroLinePosition * (chartHeight - 24);
              } else {
                barBottom = zeroLinePosition * (chartHeight - 24) - barHeight;
              }

              const xPosition = index * (barWidth + barSpacing);

              return (
                <div
                  key={index}
                  className="absolute group cursor-pointer"
                  style={{
                    left: `${xPosition}px`,
                    width: `${barWidth}px`,
                    bottom: '24px'
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                    {new Date(flow.date + 'T12:00:00.000Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatFlowValue(flowValue)}
                  </div>

                  {/* Professional thin bar */}
                  <div
                    className={`absolute transition-all duration-200 group-hover:opacity-100 ${
                      isPositive
                        ? 'bg-green-400 opacity-80 hover:bg-green-300'
                        : 'bg-red-400 opacity-80 hover:bg-red-300'
                    }`}
                    style={{
                      height: `${Math.max(2, barHeight)}px`, // Ensure minimum visible height
                      width: '100%',
                      bottom: `${barBottom}px`,
                      position: 'absolute'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis date labels */}
          <div className="absolute bottom-0 left-0 right-0 h-6 flex justify-start">
            {displayFlows.map((flow, index) => {
              const xPosition = index * (barWidth + barSpacing);
              const shouldShow = totalBars <= 14 ? index % 2 === 0 : index % Math.ceil(totalBars / 8) === 0;

              return shouldShow ? (
                <div
                  key={index}
                  className="absolute text-xs text-gray-400"
                  style={{
                    left: `${xPosition - 8}px`,
                    width: '20px',
                    textAlign: 'center'
                  }}
                >
                  {new Date(flow.date + 'T12:00:00.000Z').toLocaleDateString('en-US', { day: 'numeric' })}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
      </div>

      {/* Timeline label */}
      <div className="flex justify-center items-center mt-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Last month (30 days)
        </span>
      </div>
    </div>
  );
});

// Helper function to format millions to billions
// Backend returns values in millions, so we need to convert appropriately
const formatFlowValue = (value) => {
  // Backend values are already in millions, so display as billions if >= 1000M
  if (Math.abs(value) >= 1000) {
    return `${(value > 0 ? '+' : '')}${(value / 1000).toFixed(1)}B`;
  }
  // For values < 1000M, display in millions with proper formatting
  return `${(value > 0 ? '+' : '')}${Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1)}M`;
};

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
  const period = '1M'; // Fixed to 1M only
  
  // Performance tracking
  usePerformanceTracking('ETFFlowsCard');
  
  // Balanced data loading - allow proper cache invalidation for period toggles
  const { data: apiResponse, isLoading, error, isFetching } = useQuery({
    queryKey: ['etf-flows', period],
    queryFn: () => apiService.getETFFlows(period),
    staleTime: 5 * 60 * 1000, // 5 minutes - allows fresh data when toggling periods
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1, // Allow one retry for better reliability
    networkMode: 'offlineFirst'
  });

  // Extract data from API response with cache age calculation
  const data = useMemo(() => {
    if (apiResponse?.success && apiResponse?.data) {
      const dataTimestamp = apiResponse.data.metadata?.timestamp || apiResponse.data.timestamp || Date.now();
      const cacheAge = Date.now() - dataTimestamp;

      // Transform API flows data for proper chart rendering
      const transformedFlows = (apiResponse.data.flows || []).map(flow => ({
        date: flow.date,
        inflow: flow.inflow || flow.netFlow || flow.flow || 0, // Primary flow value for chart
        netFlow: flow.netFlow || flow.inflow || flow.flow || 0, // Net flow (can be positive or negative)
        outflow: flow.outflow || 0, // Separate outflow tracking
        cumulative: flow.cumulative || 0,
        etfsContributing: flow.etfsContributing || flow.etfBreakdown?.length || 5
      }));

      // DEBUG: Log data for inconsistency investigation
      console.log('🔍 [ETF DEBUG] Raw API Response:', {
        inflow5D: apiResponse.data.inflow5D,
        flowsCount: transformedFlows.length,
        last5Flows: transformedFlows.slice(-5).map(f => ({ date: f.date, inflow: f.inflow })),
        manualCalc5D: transformedFlows.slice(-5).reduce((sum, f) => sum + f.inflow, 0),
        status: apiResponse.data.status,
        terminalLabel: apiResponse.data.terminalLabel
      });

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
    // No API data available - return empty state instead of mock data
    console.warn('⚠️ No ETF flows data available from API - showing empty state');
    return {
      flows: [],
      inflow5D: 0,
      _fromCache: false,
      cacheAge: 0,
      cacheAgeFormatted: 'No data',
      isEmpty: true
    };
  }, [apiResponse]);
  
  // Memoized status configuration based on 5D flow value
  const statusConfig = useMemo(() => {
    return getStatusConfig(data.inflow5D, colors);
  }, [data.inflow5D, colors]);

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
      {/* Optimized Header with horizontal layout */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
              [ETF_FLOWS]
            </h3>
            <div className={`
              px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded border
              ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}
            `}>
              {statusConfig.terminalLabel}
            </div>
          </div>

          {/* Horizontal stats layout with larger main indicators */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-baseline space-x-2">
              <span className={`text-sm ${colors.text.secondary}`}>5D Net:</span>
              <span className={`text-xl font-bold ${statusConfig.color}`}>
                {formatFlowValue(data.inflow5D)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{statusConfig.icon}</span>
              <span className={`text-lg font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Period Indicator */}
        <div className={`px-2 py-1 text-xs font-mono ${colors.text.muted}`}>
          1M
        </div>
      </div>

      {/* Professional Chart - Main visual element */}
      <div className="flex-1 mb-1">
        <ETFFlowChart flows={data.flows} />
      </div>

      {/* Compact Footer */}
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

          {isFetching && (
            <span className={`font-mono ${colors.text.highlight} animate-pulse`} title="Updating data in background">
              [UPD...]
            </span>
          )}

          {!data?._fromCache && !isFetching && data.flows?.length > 0 && (
            <span className={`font-mono ${colors.text.positive}`} title="Live data from server">
              [LIVE]
            </span>
          )}

          {error && (
            <span className={`font-mono ${colors.text.negative}`} title="Using fallback data">
              [FALLBACK]
            </span>
          )}

          <span className={colors.text.muted}>
            {data.flows?.length > 0 ? 'CoinGlass' : 'Mock'}
          </span>
        </div>

        <div className={`${colors.text.muted} flex items-center space-x-1`}>
          <span>{data?.cacheAgeFormatted || 'Just now'}</span>
        </div>
      </div>
    </div>
  );
});

ETFFlowChart.displayName = 'ETFFlowChart';
ETFFlowsCard.displayName = 'ETFFlowsCard';

export default ETFFlowsCard;