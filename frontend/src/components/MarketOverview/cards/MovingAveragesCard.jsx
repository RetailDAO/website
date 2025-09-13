// Simplified Moving Averages card focused on 4 key BTC metrics
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';

// Import API service
import apiService from '../../../services/api';

// Optimized API service
const fetchMovingAverages = async () => {
  const startTime = performance.now();
  
  const result = await apiService.getMovingAverages();
  const duration = performance.now() - startTime;
  
  console.log(`📊 Moving Averages API: ${Math.round(duration)}ms`);
  
  return result.data;
};

// 50 DMA Status Logic - Based on client's requirements
const get50DMAStatus = (deviation) => {
  if (deviation > 20) return 'Danger (Overheated)';
  if (deviation >= 10 && deviation <= 20) return 'Stretched';
  if (deviation >= -10 && deviation <= 10) return 'Normal';
  if (deviation >= -20 && deviation <= -10) return 'Discounted';
  if (deviation < -20) return 'Oversold / Capitulation';
  return 'Normal';
};

// Get color for 50 DMA status
const get50DMAStatusColor = (status, colors) => {
  switch (status) {
    case 'Danger (Overheated)':
      return colors.text.negative;
    case 'Stretched':
      return 'text-orange-500';
    case 'Normal':
      return colors.text.positive;
    case 'Discounted':
      return 'text-blue-400';
    case 'Oversold / Capitulation':
      return colors.text.negative;
    default:
      return colors.text.positive;
  }
};

// 200 DMA Regime Logic
const get200DMARegime = (currentPrice, ma200Price) => {
  return currentPrice > ma200Price ? 'Bullish Regime' : 'Bearish Regime';
};

// Get color for regime
const getRegimeColor = (regime, colors) => {
  return regime === 'Bullish Regime' ? colors.text.positive : colors.text.negative;
};

// Simple metric display component
const MetricRow = React.memo(({ label, value, status, statusColor, colors, isPrice = false }) => {
  return (
    <div className="flex justify-between items-center py-2">
      <span className={`text-sm font-medium ${colors.text.secondary}`}>
        {label}:
      </span>
      
      <div className="text-right">
        <div className={`text-base font-mono ${colors.text.primary} mb-1`}>
          {isPrice ? `$${value.toLocaleString()}` : value}
        </div>
        {status && (
          <div className={`text-xs font-medium ${statusColor}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
});


const MovingAveragesCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('MovingAveragesCard');
  
  // Instant cache-first data fetching
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['moving-averages'],
    queryFn: fetchMovingAverages,
    staleTime: 0, // Always consider cached data immediately available
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Show cached data instantly while refetching in background
    refetchOnReconnect: 'always',
    networkMode: 'offlineFirst'
  });

  // Only show loading for initial load (no cached data)
  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading Moving Averages...</p>
          <p className="text-xs mt-1 opacity-60">Fetching from server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <p className="text-red-500 mb-2">⚠️ Failed to load Moving Averages</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  // Calculate the 4 key metrics based on client requirements
  const btcPrice = data?.currentPrice || 0;
  const ma50Price = data?.ma50?.value || 0;
  const ma200Price = data?.ma200?.value || 0;
  const deviationFrom50DMA = data?.ma50?.deviation || 0;
  
  // Status calculations
  const ma50Status = get50DMAStatus(deviationFrom50DMA);
  const ma50StatusColor = get50DMAStatusColor(ma50Status, colors);
  const regime200DMA = get200DMARegime(btcPrice, ma200Price);
  const regimeColor = getRegimeColor(regime200DMA, colors);

  return (
    <div className="h-full flex flex-col p-4">
      {/* Simple Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
          [BTC_MOVING_AVERAGES]
        </h3>
        
        {/* Cache Status */}
        <div className="flex items-center space-x-1">
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
        </div>
      </div>

      {/* 4 Key Metrics as requested by client */}
      <div className="space-y-1">
        {/* 1) Price of BTC */}
        <MetricRow
          label="Price of BTC"
          value={btcPrice}
          colors={colors}
          isPrice={true}
        />
        
        <div className={`border-t ${colors.border.primary} my-2`}></div>
        
        {/* 2) 50 DMA price */}
        <MetricRow
          label="50 DMA price"
          value={ma50Price}
          colors={colors}
          isPrice={true}
        />
        
        {/* 3) % from 50 DMA with status text */}
        <MetricRow
          label="% from 50 DMA"
          value={`${deviationFrom50DMA > 0 ? '+' : ''}${deviationFrom50DMA.toFixed(2)}%`}
          status={ma50Status}
          statusColor={ma50StatusColor}
          colors={colors}
        />
        
        <div className={`border-t ${colors.border.primary} my-2`}></div>
        
        {/* 4) 200 DMA price with regime status */}
        <MetricRow
          label="200 DMA price"
          value={ma200Price}
          status={regime200DMA}
          statusColor={regimeColor}
          colors={colors}
          isPrice={true}
        />
      </div>

      {/* Footer with metadata - only in development */}
      {import.meta.env.DEV && data?.metadata && (
        <div className={`mt-4 pt-2 border-t ${colors.border.primary} text-xs ${colors.text.muted}`}>
          {data.metadata.fresh ? '🔥 Fresh' : '💾 Cached'} • 
          {data.metadata.dataPoints} data points • 
          {new Date(data.metadata.calculatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

// Display names for better debugging
MetricRow.displayName = 'MetricRow';
MovingAveragesCard.displayName = 'MovingAveragesCard';

export default MovingAveragesCard;