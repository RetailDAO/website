// Rotation Breadth Card (Priority 5) - Real data integration for Market Overview v2
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { usePerformanceTracking } from '../../../utils/performance';
import { generateTransparencyTooltip, extractTransparencyData } from '../../../utils/transparencyUtils';
import apiService from '../../../services/api';
import GlitchButton from '../../ui/GlitchButton';

// Mock data simulating Top 100 coins analysis vs BTC (30D)
const generateMockRotationData = () => {
  const percentage = 20 + Math.random() * 60; // 20-80% range for realistic scenarios
  
  // Generate 5 top performing coins with realistic data
  const coinPool = [
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'NEAR', name: 'Near Protocol' },
    { symbol: 'FTM', name: 'Fantom' },
    { symbol: 'LTC', name: 'Litecoin' }
  ];
  
  const shuffled = [...coinPool].sort(() => 0.5 - Math.random());
  const topPerformers = shuffled.slice(0, 5).map((coin, index) => {
    const performance = (25 - index * 3) + (Math.random() * 10 - 5); // Decreasing performance
    return {
      symbol: coin.symbol,
      name: coin.name,
      performance: Math.round(performance * 10) / 10
    };
  }).sort((a, b) => b.performance - a.performance);
  
  return {
    percentage: Math.round(percentage * 10) / 10,
    topPerformers,
    totalAnalyzed: 100,
    coinsOutperforming: Math.round(percentage),
    timestamp: Date.now()
  };
};

// Market season categorization based on new thresholds
const getMarketSeason = (percentage) => {
  if (percentage < 35) return 'btc-season';
  if (percentage > 65) return 'frothy';
  if (percentage > 55) return 'altseason';
  return 'neutral';
};

// Market season configuration with updated categories and thresholds
const getSeasonConfig = (season, colors) => {
  const configs = {
    'btc-season': {
      color: colors.text.accent || 'text-orange-400',
      bg: colors.bg.secondary || 'bg-slate-100 dark:bg-slate-800',
      border: colors.border.secondary || 'border-slate-200 dark:border-slate-700',
      terminalLabel: '[BTC_SEASON]',
      label: 'BTC Season',
      threshold: '<35%',
      description: 'Bitcoin dominance'
    },
    'neutral': {
      color: colors.text.secondary || 'text-slate-500',
      bg: colors.bg.secondary || 'bg-slate-100 dark:bg-slate-800',
      border: colors.border.secondary || 'border-slate-200 dark:border-slate-700',
      terminalLabel: '[NEUTRAL]',
      label: 'Neutral',
      threshold: '35-55%',
      description: 'Balanced conditions'
    },
    'altseason': {
      color: colors.text.positive || 'text-emerald-400',
      bg: colors.bg.secondary || 'bg-slate-100 dark:bg-slate-800',
      border: colors.border.secondary || 'border-slate-200 dark:border-slate-700',
      terminalLabel: '[ALTSEASON]',
      label: 'Altseason',
      threshold: '>55%',
      description: 'Alt dominance'
    },
    'frothy': {
      color: colors.text.negative || 'text-rose-400',
      bg: colors.bg.secondary || 'bg-slate-100 dark:bg-slate-800',
      border: colors.border.secondary || 'border-slate-200 dark:border-slate-700',
      terminalLabel: '[FROTHY]',
      label: 'Frothy',
      threshold: '>65%',
      description: 'Extreme alt activity'
    }
  };
  
  return configs[season] || configs['neutral'];
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

const RotationBreadthCard = React.memo(() => {
  const { colors } = useTheme();
  
  // Performance tracking
  usePerformanceTracking('RotationBreadthCard');
  
  // Cache-first data loading - display cached data immediately without API calls
  const { data: apiResponse, isLoading, error, isFetching } = useQuery({
    queryKey: ['rotation-breadth'],
    queryFn: () => apiService.getRotationBreadth(),
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
        percentage: apiResponse.data.breadthPercentage || 50,
        topPerformers: (apiResponse.data.topPerformers || []).map(coin => ({
          symbol: coin.symbol,
          name: coin.name,
          performance: parseFloat(coin.performance)
        })),
        totalAnalyzed: apiResponse.data.coinsAnalyzed || 100,
        coinsOutperforming: apiResponse.data.coinsBeatingBTC || 50,
        category: apiResponse.data.category || 'Neutral',
        terminalLabel: apiResponse.data.terminalLabel || '[NEUTRAL]',
        description: apiResponse.data.description || 'Market rotation analysis',
        _fromCache: apiResponse._fromCache,
        _isStale: apiResponse._isStale,
        timestamp: dataTimestamp,
        cacheAge: cacheAge,
        cacheAgeFormatted: formatCacheAge(cacheAge)
      };
    }
    // Fallback to mock data if no cached data available
    return {
      ...generateMockRotationData(),
      _fromCache: false,
      cacheAge: 0,
      cacheAgeFormatted: 'Just now'
    };
  }, [apiResponse]);
  
  // Calculate market season
  const marketSeason = useMemo(() => {
    return getMarketSeason(data.percentage);
  }, [data.percentage]);
  
  // Memoized season configuration
  const seasonConfig = useMemo(() => {
    return getSeasonConfig(marketSeason, colors);
  }, [marketSeason, colors]);

  // Loading state - only show for initial load with no cached data
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${colors.border.primary} mx-auto mb-2`}></div>
            <div className={`text-sm ${colors.text.secondary}`}>Loading rotation data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="h-full flex flex-col">
      {/* Header - Simplified */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className={`text-sm font-mono uppercase tracking-wider ${colors.text.primary}`}>
            [ROTATION_BREADTH]
          </h3>
        </div>
        <div className={`
          px-2 py-1 text-xs font-mono uppercase tracking-wider rounded
          ${seasonConfig.bg} ${seasonConfig.border} border
          ${seasonConfig.color}
        `}>
          <span>{seasonConfig.terminalLabel}</span>
        </div>
      </div>

      {/* Main Content - Centered and Evenly Distributed */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6">
        {/* Main percentage display */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${colors.text.primary}`}>
            {data.percentage}%
          </div>
          <div className={`text-sm ${colors.text.secondary} mt-2`}>
            of Top {data.totalAnalyzed} coins outperforming BTC (30D)
          </div>
        </div>

        {/* Glitch Button Season Indicator */}
        <div className="text-center">
          <GlitchButton
            text={seasonConfig.label}
            statusType={marketSeason === 'altseason' || marketSeason === 'frothy' ? 'easing' : marketSeason === 'btc-season' ? 'tightening' : 'neutral'}
            size="sm"
          />
        </div>
      </div>

      {/* Data Source and Status */}
      <div className="space-y-1">
        {/* Cache/Fetching Status Indicators */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {data._fromCache && (
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
            {apiResponse?.success ? 'CoinGecko' : 'Mock'} • {data.cacheAgeFormatted}
          </div>
        </div>

      </div>
      </div>
  );
});

RotationBreadthCard.displayName = 'RotationBreadthCard';

export default RotationBreadthCard;