// Performance-optimized Moving Averages card for Market Overview v2
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { usePriceWebSocket } from '../../../hooks/useWebSocket';

// Crypto configuration for toggle functionality
const CRYPTO_CONFIG = {
  BTC: { 
    name: 'Bitcoin', 
    symbol: 'BTC',
    color: '#F7931A',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30'
  },
  ETH: { 
    name: 'Ethereum', 
    symbol: 'ETH',
    color: '#627EEA',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30'
  },
  SOL: { 
    name: 'Solana', 
    symbol: 'SOL',
    color: '#9945FF',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30'
  }
};

// Crypto Selector Component
const CryptoSelector = React.memo(({ selected, onChange, liveData, colors }) => {
  return (
    <div className="flex space-x-1 mb-2">
      {Object.entries(CRYPTO_CONFIG).map(([crypto, config]) => {
        const isSelected = selected === crypto;
        const hasLiveData = liveData[crypto]?.price !== null;
        
        return (
          <button
            key={crypto}
            onClick={() => onChange(crypto)}
            className={`
              relative px-2 py-1 text-xs font-mono uppercase tracking-wider
              border rounded transition-all duration-200
              ${isSelected 
                ? `${config.bgColor} ${config.textColor} ${config.borderColor} border-2` 
                : `${colors.bg.tertiary} ${colors.text.secondary} ${colors.border.primary} border hover:${colors.border.secondary}`
              }
            `}
            title={`Switch to ${config.name} price data`}
          >
            <div className="flex items-center space-x-1">
              <span>{crypto}</span>
              {hasLiveData && (
                <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-current' : 'bg-green-400'} animate-pulse`}></div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
});

// Price Display Component for live crypto prices
const PriceDisplay = React.memo(({ priceData, config, isConnected, colors }) => {
  if (!priceData) {
    return (
      <div className={`text-center ${colors.text.secondary} py-4`}>
        <div className="text-base">No price data available</div>
        <div className="text-sm">Connecting to live feed...</div>
      </div>
    );
  }

  const formatVolume = (volume) => {
    if (!volume) return 'N/A';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
    return `$${(volume / 1e3).toFixed(1)}K`;
  };

  /*
  const getTimeSince = (lastUpdate) => {
    if (!lastUpdate) return null;
    const seconds = Math.floor((new Date() - new Date(lastUpdate)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };
  */

  return (
    <div className="space-y-1">
      {/* Main Price - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-lg font-bold ${colors.text.primary}`}>
            ${priceData.price.toLocaleString()}
          </div>
          <div className={`text-xs ${colors.text.secondary} flex items-center space-x-1`}>
            <span>{config.name}</span>
            {priceData.isLive && isConnected && (
              <>
                <div className={`w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse`}></div>
                <span className="text-green-400">LIVE</span>
              </>
            )}
          </div>
        </div>
        
        {/* Compact source indicator */}
        <div className="text-right">
          <div className={`text-xs ${colors.text.muted}`}>
            {priceData.source === 'api' ? '📊' : '🔌'}
          </div>
        </div>
      </div>

      {/* 24h Change and Volume - Single line */}
      {(priceData.change24h !== null || priceData.volume24h) && (
        <div className="flex items-center justify-between text-xs">
          {priceData.change24h !== null && (
            <div className={`flex items-center space-x-1 ${
              priceData.change24h >= 0 ? colors.text.positive : colors.text.negative
            }`}>
              <span>{priceData.change24h >= 0 ? '↗' : '↘'}</span>
              <span>{priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%</span>
            </div>
          )}
          
          {priceData.volume24h && (
            <div className={`text-xs ${colors.text.secondary}`}>
              Vol: {formatVolume(priceData.volume24h)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Optimized API service
const fetchMovingAverages = async () => {
  const startTime = performance.now();
  
  const response = await fetch('/api/v1/market-overview/moving-averages');
  if (!response.ok) {
    throw new Error(`Moving Averages API error: ${response.status}`);
  }
  
  const result = await response.json();
  const duration = performance.now() - startTime;
  
  console.log(`📊 Moving Averages API: ${Math.round(duration)}ms`);
  
  return result.data;
};

// Terminal-style status configuration optimized for all themes
const getStatusConfig = (status, colors) => {
  const configs = {
    'Overheated': {
      color: colors.text.negative,
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '[HOT]',
      label: 'OVERHEATED'
    },
    'Stretched': {
      color: colors.text.accent, 
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '[HIGH]',
      label: 'STRETCHED'
    },
    'Normal': {
      color: colors.text.positive,
      bg: colors.bg.tertiary, 
      border: colors.border.secondary,
      icon: '[OK]',
      label: 'NORMAL'
    },
    'Discounted': {
      color: colors.text.highlight,
      bg: colors.bg.tertiary,
      border: colors.border.secondary, 
      icon: '[LOW]',
      label: 'DISCOUNTED'
    },
    'Oversold': {
      color: colors.text.highlight,
      bg: colors.bg.tertiary,
      border: colors.border.secondary,
      icon: '[DEEP]',
      label: 'OVERSOLD'
    }
  };
  
  return configs[status] || configs['Normal'];
};

// Terminal-style regime indicator
const RegimeIndicator = React.memo(({ regime, colors }) => {
  const isBull = regime === 'Bull';
  
  return (
    <div className={`
      flex items-center space-x-1 px-2 py-0.5 text-xs font-mono uppercase tracking-wider
      ${colors.bg.tertiary} ${colors.border.primary} border-0
      ${isBull ? colors.text.positive : colors.text.negative}
    `} style={{borderRadius: '0px'}}>
      <span>{isBull ? '[BULL]' : '[BEAR]'}</span>
    </div>
  );
});

// MA Row component for displaying individual MA data
const MARow = React.memo(({ label, value, deviation, status, colors }) => {
  const statusConfig = getStatusConfig(status, colors);
  
  return (
    <div className="flex justify-between items-center py-1">
      <span className={`text-sm font-medium ${colors.text.secondary}`}>
        {label}
      </span>
      
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-mono ${colors.text.primary}`}>
          ${value.toLocaleString()}
        </span>
        
        <div className="flex items-center space-x-1">
          <span className={`text-xs ${statusConfig.color}`}>
            {deviation > 0 ? '+' : ''}{deviation}%
          </span>
          {status && (
            <span 
              className={`
                px-1.5 py-0.5 rounded text-xs font-medium
                ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border} border
              `}
              title={`Price is ${Math.abs(deviation)}% ${deviation > 0 ? 'above' : 'below'} ${label}`}
            >
              {statusConfig.icon}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const MovingAveragesCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('MovingAveragesCard');
  
  // Crypto selection state
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  
  // WebSocket price data
  const { prices: liveData, isConnected } = usePriceWebSocket();
  
  // Optimized data fetching with intelligent caching
  const { data, isLoading, error, isStale } = useQuery({
    queryKey: ['moving-averages'],
    queryFn: fetchMovingAverages,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time for performance
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  // Get current price data based on selected crypto
  const currentPriceData = useMemo(() => {
    const livePrice = liveData[selectedCrypto];
    const btcPrice = data?.currentPrice; // BTC price from MA API
    
    if (selectedCrypto === 'BTC' && btcPrice) {
      // For BTC, use API price as primary, WebSocket as supplementary
      return {
        price: btcPrice,
        change24h: livePrice?.change24h || null,
        volume24h: livePrice?.volume24h || null,
        source: 'api',
        lastUpdate: livePrice?.lastUpdate || null,
        isLive: !!livePrice?.lastUpdate
      };
    } else if (livePrice?.price) {
      // For ETH/SOL, use WebSocket data
      return {
        price: livePrice.price,
        change24h: livePrice.change24h,
        volume24h: livePrice.volume24h,
        source: 'websocket',
        lastUpdate: livePrice.lastUpdate,
        isLive: true
      };
    }
    
    return null;
  }, [selectedCrypto, liveData, data?.currentPrice]);

  /*const priceChange = useMemo(() => {
    if (!data) return null;
    
    const change = data.ma50.deviation;
    return {
      value: change,
      isPositive: change > 0,
      magnitude: Math.abs(change)
    };
  }, [data?.ma50.deviation]);*/

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading Moving Averages...</p>
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

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
          [MOVING_AVERAGES]
        </h3>
        <div className="flex items-center space-x-1">
          <RegimeIndicator regime={data.ma200.regime} colors={colors} />
          {isStale && (
            <span className={`text-xs font-mono ${colors.text.accent}`} title="Data refresh in progress">
              [REF...]
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: Live Prices (Compact) */}
      <div className={`mb-2 p-2 rounded-lg border ${colors.bg.tertiary} ${colors.border.primary}`}>
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs font-mono uppercase tracking-wider ${colors.text.secondary}`}>
            📊 LIVE PRICES
          </span>
          {isConnected && (
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <span className={`text-xs ${colors.text.positive}`}>CONN</span>
            </div>
          )}
        </div>
        
        <CryptoSelector 
          selected={selectedCrypto} 
          onChange={setSelectedCrypto} 
          liveData={liveData}
          colors={colors}
        />
        
        <PriceDisplay 
          priceData={currentPriceData}
          config={CRYPTO_CONFIG[selectedCrypto]}
          isConnected={isConnected}
          colors={colors}
        />
      </div>

      {/* SECTION 2: BTC Moving Averages (Compact) */}
      <div className="flex-1 min-h-0">
        <div className={`text-xs font-mono uppercase tracking-wider ${colors.text.secondary} mb-1`}>
          🔍 BTC MOVING AVERAGES
        </div>
        
        <div className="space-y-1">
          <MARow
            label="50D MA"
            value={data.ma50.value}
            deviation={data.ma50.deviation}
            status={data.ma50.status}
            colors={colors}
          />
          
          <div className={`border-t ${colors.border.primary} my-1`}></div>
          
          <MARow
            label="200D MA"  
            value={data.ma200.value}
            deviation={data.ma200.deviation}
            status={null}
            colors={colors}
          />
        </div>

        {/* Compact Analysis Summary */}
        <div className={`mt-2 p-2 rounded-lg ${colors.bg.tertiary}`}>
          <div className={`text-xs font-medium ${colors.text.secondary} mb-1`}>
            BTC Analysis
          </div>
          <div className={`text-sm ${colors.text.primary}`}>
            {data.analysis.pricePosition}
          </div>
          
          {/* Compact Signals */}
          {(data.analysis.signals.goldenCross || data.analysis.signals.deathCross) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.analysis.signals.goldenCross && (
                <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                  ✨ Golden
                </span>
              )}
              {data.analysis.signals.deathCross && (
                <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                  ☠️ Death
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with metadata - only in development */}
      {process.env.NODE_ENV === 'development' && data.metadata && (
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
RegimeIndicator.displayName = 'RegimeIndicator';
MARow.displayName = 'MARow';
CryptoSelector.displayName = 'CryptoSelector';
PriceDisplay.displayName = 'PriceDisplay';
MovingAveragesCard.displayName = 'MovingAveragesCard';

export default MovingAveragesCard;