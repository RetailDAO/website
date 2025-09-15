// ETF Flows Card (Priority 6) - Real data integration for Market Overview v2
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import apiService from '../../../services/api';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';
import TimeTooltip from '../../common/TimeTooltip';

// Mock data with realistic positive and negative flows
const generateMockETFData = (period) => {
  const days = period === '2W' ? 14 : 30;
  const flows = [];

  // More realistic flow patterns - some days positive, some negative
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Create more realistic flow patterns
    const baseFlow = Math.random() < 0.7 ? 1 : -1; // 70% chance positive, 30% negative
    const magnitude = Math.random() * 1500 + 200; // 200-1700M magnitude
    const inflow = Math.round(baseFlow * magnitude);

    flows.push({
      date: date.toISOString().split('T')[0],
      inflow: inflow,
      cumulative: flows.length > 0 ? flows[flows.length - 1].cumulative + inflow : inflow
    });
  }

  const inflow5D = flows.slice(-5).reduce((sum, day) => sum + day.inflow, 0);

  return {
    period,
    flows,
    inflow5D: Math.round(inflow5D),
    timestamp: Date.now()
  };
};

// Get ETF status based on 5D net flows according to Kevin's requirements
const getETFStatus = (inflow5D) => {
  if (inflow5D >= 1500) return 'INFLOWS';
  if (inflow5D <= -750) return 'OUTFLOWS';
  return 'MIXED';
};

// Terminal-style status configuration - Updated for Kevin's requirements
const getStatusConfig = (inflow5D, colors) => {
  const status = getETFStatus(inflow5D);

  const configs = {
    'INFLOWS': {
      color: colors.text.positive,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[INFLOWS]',
      label: 'Inflows',
      description: 'Strong institutional buying',
      icon: '🔥'
    },
    'OUTFLOWS': {
      color: colors.text.negative,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[OUTFLOWS]',
      label: 'Outflows',
      description: 'Heavy institutional selling',
      icon: '📉'
    },
    'MIXED': {
      color: colors.text.secondary,
      bg: colors.bg.secondary,
      border: colors.border.secondary,
      terminalLabel: '[MIXED]',
      label: 'Mixed',
      description: 'Balanced flows',
      icon: '⚖️'
    }
  };

  return configs[status];
};

// Clean column chart component for ETF flows - Improved visualization
const ETFFlowChart = React.memo(({ flows, colors, period }) => {
  if (!flows || flows.length === 0) return (
    <div className="w-full h-40 flex items-center justify-center">
      <span className={`text-sm ${colors.text.secondary}`}>No flow data available</span>
    </div>
  );
  
  // Display all data returned by backend (2W = 14 days, 1M = 30 days)
  const displayFlows = flows;
  
  const maxInflow = Math.max(...displayFlows.map(f => f.inflow));
  const minInflow = Math.min(...displayFlows.map(f => f.inflow));
  
  // Calculate optimal bar dimensions based on data length
  const containerWidth = 320;
  const totalBars = displayFlows.length;
  const barSpacing = totalBars > 20 ? 1 : 2; // Reduce spacing for more bars
  const barWidth = Math.max(3, Math.floor((containerWidth - (totalBars - 1) * barSpacing) / totalBars));
  const chartHeight = 120;
  
  // Create value scale with some padding
  const valueRange = maxInflow - Math.min(minInflow, 0);
  const scalePadding = valueRange * 0.1;
  const scaleMax = maxInflow + scalePadding;
  const scaleMin = Math.min(minInflow - scalePadding, 0);
  
  return (
    <div className="w-full h-40 flex flex-col">
      {/* Chart container */}
      <div className="flex-1 relative px-4">
        {/* Background grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-full h-px ${colors.border.primary}`} />
          ))}
        </div>
        
        {/* Zero line if needed */}
        {scaleMin < 0 && (
          <div 
            className={`absolute w-full h-px ${colors.border.primary} opacity-50 z-10`} 
            style={{ 
              bottom: `${(Math.abs(scaleMin) / valueRange) * chartHeight}px` 
            }} 
          />
        )}
        
        {/* Bars container */}
        <div className="flex items-end justify-center h-full space-x-0.5 relative pt-4">
          {displayFlows.map((flow, index) => {
            const flowValue = flow.inflow;
            const isPositive = flowValue >= 0;
            
            // Calculate bar height properly for positive and negative values
            let barHeight, barBottom;

            if (isPositive) {
              // Positive bars grow upward from zero line
              const heightRatio = flowValue / (scaleMax - Math.max(0, scaleMin));
              barHeight = Math.max(3, heightRatio * (chartHeight * 0.9));
              barBottom = scaleMin < 0 ? (Math.abs(scaleMin) / (scaleMax - scaleMin)) * chartHeight : 0;
            } else {
              // Negative bars grow downward from zero line
              const heightRatio = Math.abs(flowValue) / Math.abs(Math.min(0, scaleMin));
              barHeight = Math.max(3, heightRatio * (chartHeight * 0.9));
              barBottom = scaleMin < 0 ? (Math.abs(scaleMin) / (scaleMax - scaleMin)) * chartHeight - barHeight : chartHeight - barHeight;
            }
            
            // Color intensity based on flow size
            const intensity = Math.abs(flowValue) / maxInflow;
            const opacityClass = intensity > 0.8 ? 'opacity-100' : intensity > 0.6 ? 'opacity-80' : 'opacity-65';
            
            return (
              <div
                key={index}
                className="relative group cursor-pointer"
                style={{ width: `${barWidth}px` }}
              >
                {/* Tooltip */}
                <div className={`
                  absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                  bg-gray-900 text-white text-xs px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity z-20
                  whitespace-nowrap
                `}>
                  {new Date(flow.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatFlowValue(flowValue)}
                </div>
                
                {/* Bar */}
                <div
                  className={`
                    absolute
                    ${isPositive
                      ? 'bg-green-500 dark:bg-green-400'
                      : 'bg-red-500 dark:bg-red-400'
                    }
                    ${opacityClass} group-hover:opacity-100
                    transition-all duration-200 group-hover:scale-105
                    ${isPositive ? 'rounded-t-sm' : 'rounded-b-sm'}
                  `}
                  style={{
                    height: `${barHeight}px`,
                    minHeight: '3px',
                    bottom: `${barBottom}px`,
                    width: '100%'
                  }}
                />
                
                {/* Date label - show only for every few days if many bars */}
                {(totalBars <= 14 || index % Math.ceil(totalBars / 10) === 0) && (
                  <div className={`text-xs text-center mt-1 ${colors.text.muted}`}>
                    {new Date(flow.date).toLocaleDateString('en-US', { day: 'numeric' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Timeline label */}
      <div className="flex justify-center items-center mt-2 px-4">
        <span className={`text-xs ${colors.text.muted}`}>
          {period === '2W' ? 'Last 2 weeks (14 days)' : 'Last month (30 days)'}
        </span>
      </div>
    </div>
  );
});

// Helper function to format millions to billions
const formatFlowValue = (value) => {
  if (Math.abs(value) >= 1000) {
    return `${(value > 0 ? '+' : '')}${(value / 1000).toFixed(1)}B`;
  }
  return `${(value > 0 ? '+' : '')}${value.toFixed(0)}M`;
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
  const [period, setPeriod] = useState('2W');
  
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
    <TimeTooltip
      nextUpdateTime={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()}
      position="bottom"
    >
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
            <div className={`text-xl font-bold ${statusConfig.color}`}>
              {formatFlowValue(data.inflow5D)}
            </div>
            <span className={`text-xs ${statusConfig.color} font-medium`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
          <div className={`text-xs ${colors.text.secondary}`}>
            {statusConfig.description}
          </div>
        </div>

      </div>
    </TimeTooltip>
  );
});

ETFFlowChart.displayName = 'ETFFlowChart';
ETFFlowsCard.displayName = 'ETFFlowsCard';

export default ETFFlowsCard;