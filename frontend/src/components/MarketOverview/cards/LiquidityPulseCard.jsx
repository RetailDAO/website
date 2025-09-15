// Performance-optimized Liquidity Pulse card with interactive ApexCharts for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';
import Chart from 'react-apexcharts';

// Interactive US 2Y Treasury yield chart with ApexCharts - supports all theme variants
const US2YChart = React.memo(({ data, height = 120, historicalData = [] }) => {
  const { currentTheme, colors } = useTheme();

  const chartOptions = useMemo(() => {
    if (!data || data.length < 2) return null;

    // Calculate data range for proper scaling
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue;
    const padding = range * 0.05; // 5% padding

    // Theme-specific chart colors
    const getChartColors = () => {
      switch (currentTheme) {
        case 'bloomberg': // Traditional Terminal
          return {
            lineColor: '#3b82f6', // Blue for treasury data
            gradientFrom: '#3b82f6',
            gradientTo: '#1d4ed8',
            textColor: colors.chart.text,
            gridColor: colors.chart.grid,
            axisColor: colors.chart.axis,
          };
        case 'accessible': // High Contrast
          return {
            lineColor: '#60a5fa', // Accessible blue
            gradientFrom: '#60a5fa',
            gradientTo: '#3b82f6',
            textColor: colors.chart.text,
            gridColor: colors.chart.grid,
            axisColor: colors.chart.axis,
          };
        case 'retro': // Retro Terminal
          return {
            lineColor: '#4ade80', // Terminal green
            gradientFrom: '#4ade80',
            gradientTo: '#22c55e',
            textColor: colors.chart.text,
            gridColor: colors.chart.grid,
            axisColor: colors.chart.axis,
          };
        default:
          return {
            lineColor: '#3b82f6',
            gradientFrom: '#3b82f6',
            gradientTo: '#1d4ed8',
            textColor: colors.chart.text,
            gridColor: colors.chart.grid,
            axisColor: colors.chart.axis,
          };
      }
    };

    const chartColors = getChartColors();

    return {
      chart: {
        type: 'area',
        height: height,
        toolbar: { show: false },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
        },
        zoom: { enabled: false },
        selection: { enabled: false },
        fontFamily: colors.font || 'inherit',
      },
      stroke: {
        curve: 'smooth',
        width: 2.5,
        colors: [chartColors.lineColor],
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          gradientToColors: [chartColors.gradientTo],
          shadeIntensity: 1,
          type: 'vertical',
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      grid: {
        show: true,
        borderColor: chartColors.gridColor,
        strokeDashArray: currentTheme === 'retro' ? 0 : 2, // Solid lines for retro
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 0, right: 0 },
      },
      xaxis: {
        type: 'category',
        categories: data.map((_, index) => `D${index + 1}`),
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: [chartColors.textColor],
            fontSize: '11px',
            fontFamily: currentTheme === 'retro' ? 'monospace' : 'inherit',
          },
          formatter: (value) => {
            if (typeof value === 'number' && !isNaN(value)) {
              return `${value.toFixed(2)}%`;
            }
            return '0.00%';
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        forceNiceScale: false,
        decimalsInFloat: 3,
        min: minValue - padding,
        max: maxValue + padding,
      },
      tooltip: {
        enabled: true,
        theme: 'dark', // All themes are dark
        style: {
          fontSize: '12px',
          fontFamily: currentTheme === 'retro' ? 'monospace' : 'inherit',
        },
        custom: function({ series, seriesIndex, dataPointIndex }) {
          const value = series[seriesIndex][dataPointIndex];
          const date = historicalData[dataPointIndex]?.date || `Point ${dataPointIndex + 1}`;

          // Theme-specific tooltip styling
          const tooltipStyle = currentTheme === 'retro'
            ? 'bg-black border border-green-700 text-green-400 font-mono'
            : currentTheme === 'accessible'
            ? 'bg-gray-900 border border-gray-600 text-white'
            : 'bg-gray-950 border border-gray-700 text-orange-400';

          return `
            <div class="${tooltipStyle} rounded-lg p-3 shadow-lg">
              <div class="text-xs font-medium opacity-70 mb-1">US 2Y Treasury</div>
              <div class="text-sm font-semibold">${value.toFixed(3)}%</div>
              <div class="text-xs opacity-60 mt-1">${date}</div>
            </div>
          `;
        },
      },
      markers: {
        size: 0,
        hover: {
          size: 6,
          sizeOffset: 2,
          strokeColors: [chartColors.lineColor],
          strokeWidth: 2,
        },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
    };
  }, [data, colors, height, historicalData, currentTheme]);

  const chartSeries = useMemo(() => {
    if (!data || data.length < 2) return [];

    return [{
      name: 'US 2Y Treasury Yield',
      data: data,
    }];
  }, [data]);

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <span className={`text-sm ${colors.text.secondary} ${currentTheme === 'retro' ? 'font-mono' : ''}`}>
          No chart data available
        </span>
      </div>
    );
  }

  if (!chartOptions) return null;

  return (
    <div className="w-full" style={{ height }}>
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="area"
        height={height}
        width="100%"
      />
    </div>
  );
});

// Import API service
import apiService from '../../../services/api';

// Status state mapping based on 30-day change in basis points
const getLiquidityStatus = (change30Day) => {
  if (change30Day <= -25) return {
    status: 'easing',
    label: 'Easing (Risk-On)',
    color: '#10b981', // Green
    description: 'Yields dropped ≥25 bps'
  };
  if (change30Day >= 25) return {
    status: 'tightening',
    label: 'Tightening (Risk-Off)',
    color: '#ef4444', // Red
    description: 'Yields rose ≥25 bps'
  };
  return {
    status: 'neutral',
    label: 'Neutral',
    color: '#f59e0b', // Yellow
    description: 'Between -25 and +25 bps'
  };
};

// Modern status indicator component
const StatusIndicator = React.memo(({ statusInfo, colors }) => {
  const { currentTheme } = useTheme();

  return (
    <div className="flex justify-center">
      <div
        className={`
          inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold
          transition-all duration-300 ease-in-out
          ${currentTheme === 'retro' ? 'font-mono' : ''}
          hover:scale-105 hover:shadow-lg
        `}
        style={{
          backgroundColor: statusInfo.color + '15',
          color: statusInfo.color,
          border: `1.5px solid ${statusInfo.color}60`,
          boxShadow: `0 0 20px ${statusInfo.color}20`,
        }}
      >
        <span className="tracking-wide">
          {statusInfo.label}
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

const LiquidityPulseCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('LiquidityPulseCard');
  
  // Cache-first data loading - display cached data immediately without API calls
  const { data: apiResponse, isLoading, error, isFetching } = useQuery({
    queryKey: ['liquidity-pulse', '30D'],
    queryFn: () => apiService.getLiquidityPulse('30D'),
    staleTime: Infinity, // Never consider cached data stale - true cache-first
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry on mount, only background refresh
    networkMode: 'offlineFirst',
    initialDataUpdatedAt: 0
  });

  // Extract data from API response with cache age calculation
  const data = useMemo(() => {
    if (apiResponse?.success && apiResponse?.data) {
      const dataTimestamp = apiResponse.data.metadata?.timestamp || Date.now();
      const cacheAge = Date.now() - dataTimestamp;
      
      return {
        ...apiResponse.data,
        _fromCache: apiResponse._fromCache,
        _isStale: apiResponse._isStale,
        cacheAge: cacheAge,
        cacheAgeFormatted: formatCacheAge(cacheAge)
      };
    }
    return null;
  }, [apiResponse]);

  // Memoize chart data and historical data for performance
  const { chartData, historicalData } = useMemo(() => {
    if (!data?.treasury2Y?.data) return { chartData: null, historicalData: [] };

    // Extract last 30 points for better visualization
    const recentData = data.treasury2Y.data.slice(-30);
    const chartDataArray = recentData.map(item => item.yield);

    return {
      chartData: chartDataArray,
      historicalData: recentData.map(item => ({
        date: item.date ? new Date(item.date).toLocaleDateString() : 'Unknown',
        yield: item.yield
      }))
    };
  }, [data?.treasury2Y?.data]);

  // Calculate 30-day change and status
  const liquidityStatusInfo = useMemo(() => {
    const change30Day = data?.pulse?.analysis?.trend30Day || 0;
    return getLiquidityStatus(change30Day);
  }, [data?.pulse?.analysis?.trend30Day]);

  // Get current 30-day change for display
  const change30Day = data?.pulse?.analysis?.trend30Day || 0;

  // Only show loading for initial load (no cached data)
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col p-4" style={{ minHeight: '280px', maxHeight: '320px' }}>
        {/* Header skeleton */}
        <div className="mb-2">
          <div className={`h-4 w-28 rounded ${colors.bg.tertiary} animate-pulse mb-1`}></div>
          <div className={`h-3 w-20 rounded ${colors.bg.tertiary} animate-pulse`}></div>
          <span className={`text-xs font-mono ${colors.text.highlight} animate-pulse`}>
            [LOADING_CACHE...]
          </span>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`h-12 w-12 rounded-full ${colors.bg.tertiary} animate-pulse mx-auto mb-2`}></div>
            <div className={`h-4 w-28 rounded ${colors.bg.tertiary} animate-pulse mx-auto mb-2`}></div>
            <div className={`h-3 w-20 rounded ${colors.bg.tertiary} animate-pulse mx-auto`}></div>
            <div className={`mt-4 text-xs ${colors.text.muted} font-mono`}>
              RETRIEVING_CACHED_DATA
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className={`text-center ${colors.text.secondary}`}>
          <p className="text-red-500 mb-2">⚠️ Failed to load Liquidity Pulse</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  const currentYield = data?.treasury2Y?.current?.yield;

  return (
    <div className="h-full flex flex-col">
      {/* Header - Now at the top */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [LIQUIDITY_PULSE]
          </h3>
          <p className={`text-xs ${colors.text.secondary}`}>
            States (30-day change)
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-2">
            {data?._fromCache && (
              <span 
                className={`text-xs font-mono ${data._isStale ? colors.text.accent : colors.text.positive} cursor-help`} 
                title={generateTransparencyTooltip({
                  ...extractTransparencyData(data),
                  existingTooltip: data._isStale ? "Showing cached data, updating..." : "Fresh cached data"
                })}
              >
                [{data._isStale ? 'CACHE*' : 'CACHE'}]
              </span>
            )}
            
            {isFetching && (
              <span className={`text-xs font-mono ${colors.text.highlight} animate-pulse`} title="Updating data in background">
                [UPD...]
              </span>
            )}
            
            {!data?._fromCache && !isFetching && (
              <span className={`text-xs font-mono ${colors.text.positive}`} title="Live data from server">
                [LIVE]
              </span>
            )}
            
            {error && (
              <span className={`text-xs font-mono ${colors.text.negative}`} title="Using fallback data">
                [FALLBACK]
              </span>
            )}
          </div>
          
          {data && (
            <div className={`text-xs ${colors.text.muted}`}>
              {data.cacheAgeFormatted || 'Just now'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - US 2Y Treasury Chart */}
      <div className="flex-1 mb-3">
        <div className="mb-4">
          <h4 className={`text-lg font-semibold ${colors.text.primary}`}>
            US 2Y Treasury Yield
          </h4>
          <div className={`text-2xl font-bold ${colors.text.primary}`}>
            {currentYield}%
            <span className={`text-base font-normal ${colors.text.secondary} ml-3`}>
              30D: {change30Day > 0 ? '+' : ''}{change30Day}bps
            </span>
          </div>
        </div>
        {chartData && (
          <div className="w-full mb-4">
            <US2YChart
              data={chartData}
              height={100}
              historicalData={historicalData}
            />
          </div>
        )}
      </div>

      {/* Status Indicator at Bottom */}
      <div className="mt-auto">
        <StatusIndicator statusInfo={liquidityStatusInfo} colors={colors} />
      </div>

      {/* Development metadata */}
      {process.env.NODE_ENV === 'development' && data?.metadata && (
        <div className={`mt-2 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          FRED • {data.metadata.dataPoints} points • 
          {data.metadata.fresh ? ' 🔥 Fresh' : ' 💾 Cached'} • 
          {Math.round(data.metadata.processingTime)}ms
        </div>
      )}
    </div>
  );
});

// Display names for better debugging
US2YChart.displayName = 'US2YChart';
StatusIndicator.displayName = 'StatusIndicator';
LiquidityPulseCard.displayName = 'LiquidityPulseCard';

export default LiquidityPulseCard;