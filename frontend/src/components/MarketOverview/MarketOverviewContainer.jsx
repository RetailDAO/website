// Performance-optimized Market Overview container
import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePerformanceTracking } from '../../utils/performance';
import useIntersectionObserver from './hooks/useIntersectionObserver';
import GridLayout from './layout/GridLayout';
import CardContainer from './layout/CardContainer';
import { 
  MovingAveragesSkeleton,
  LeverageSkeleton,
  LargeCardSkeleton,
  FuturesBasisSkeleton,
  RotationSkeleton
} from './layout/OptimizedSkeletons';

// Lazy load all cards for optimal performance
const MovingAveragesCard = lazy(() => import('./cards/MovingAveragesCard'));
const LiquidityPulseCard = lazy(() => import('./cards/LiquidityPulseCard'));
const StateOfLeverageCard = lazy(() => import('./cards/StateOfLeverageCard'));
const RotationBreadthCard = lazy(() => import('./cards/RotationBreadthCard'));
const ETFFlowsCard = lazy(() => import('./cards/ETFFlowsCard'));
const FuturesBasisCard = lazy(() => import('./cards/FuturesBasisCard'));

const MarketOverviewContainer = React.memo(() => {
  const { colors } = useTheme();
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // Performance tracking for the entire container
  usePerformanceTracking('MarketOverviewContainer');

  // Card configuration optimized for progressive loading
  const cardConfigs = useMemo(() => [
    { 
      id: 'moving-averages', 
      component: MovingAveragesCard,
      skeleton: MovingAveragesSkeleton,
      size: 'medium',
      priority: 1, // Load first (fastest API, simple UI)
      estimatedLoadTime: 100
    },
    { 
      id: 'leverage-state', 
      component: StateOfLeverageCard,
      skeleton: LeverageSkeleton, 
      size: 'medium',
      priority: 2, // Quick to load, existing CoinGlass API
      estimatedLoadTime: 150
    },
    { 
      id: 'futures-basis', 
      component: FuturesBasisCard,
      skeleton: FuturesBasisSkeleton,
      size: 'medium',
      priority: 3, // Simple UI, new API
      estimatedLoadTime: 200
    },
    { 
      id: 'liquidity-pulse', 
      component: LiquidityPulseCard,
      skeleton: LargeCardSkeleton,
      size: 'large',
      priority: 4, // Chart component, FRED API
      estimatedLoadTime: 300
    },
    { 
      id: 'rotation-breadth', 
      component: RotationBreadthCard,
      skeleton: RotationSkeleton,
      size: 'medium',
      priority: 5, // Complex calculation, many API calls
      estimatedLoadTime: 400
    },
    { 
      id: 'etf-flows', 
      component: ETFFlowsCard,
      skeleton: LargeCardSkeleton,
      size: 'large',
      priority: 6, // Most complex - new API, chart, fallbacks
      estimatedLoadTime: 600
    }
  ], []);

  // Progressive loading with intersection observer
  const { ref: containerRef } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px', // Start loading before fully visible
    onIntersect: (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const cardId = entry.target.dataset.cardId;
          if (cardId && !visibleCards.has(cardId)) {
            console.log(`🚀 Loading card: ${cardId}`);
            setVisibleCards(prev => new Set([...prev, cardId]));
            
            // Track loading performance
            const loadStart = performance.now();
            setPerformanceMetrics(prev => ({
              ...prev,
              [cardId]: { loadStart }
            }));
          }
        }
      });
    }
  });

  return (
    <div ref={containerRef} className="market-overview-container">
      {/* Header with performance indicator */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${colors.text.primary}`}>
              Market Overview
            </h1>
            <p className={`text-sm ${colors.text.secondary} mt-1`}>
              Real-time institutional-grade market analysis
            </p>
          </div>
          
          {/* Performance indicator */}
          {Object.keys(performanceMetrics).length > 0 && (
            <div className={`text-xs ${colors.text.muted} flex items-center space-x-2`}>
              <div className="flex space-x-1">
                {cardConfigs.map(config => (
                  <div
                    key={config.id}
                    className={`w-2 h-2 rounded-full ${
                      visibleCards.has(config.id) 
                        ? 'bg-green-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    title={`${config.id}: ${visibleCards.has(config.id) ? 'Loaded' : 'Loading'}`}
                  />
                ))}
              </div>
              <span>
                {visibleCards.size}/6 loaded
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Grid Layout with Cards */}
      <GridLayout>
        {cardConfigs
          .sort((a, b) => a.priority - b.priority) // Load by priority order
          .map(({ id, component: Component, skeleton: Skeleton, size, priority }) => (
            <CardContainer 
              key={id}
              size={size}
              data-card-id={id}
              style={{
                // Ensure consistent heights to prevent CLS
                minHeight: size === 'large' ? '500px' : '400px'
              }}
            >
              {visibleCards.has(id) ? (
                <Suspense fallback={<Skeleton />}>
                  <Component />
                </Suspense>
              ) : (
                // Show skeleton until card becomes visible
                <Skeleton />
              )}
            </CardContainer>
          ))}
      </GridLayout>

      {/* Development Performance Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`mt-8 p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <h3 className={`text-lg font-semibold ${colors.text.primary} mb-2`}>
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Bundle Target:</strong> &lt;350KB
            </div>
            <div>
              <strong>TBT Target:</strong> &lt;200ms
            </div>
            <div>
              <strong>Cards Loaded:</strong> {visibleCards.size}/6
            </div>
            <div>
              <strong>Lighthouse Target:</strong> 85+
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Run <code>npm run perf:monitor</code> to check performance metrics
          </div>
        </div>
      )}
    </div>
  );
});

MarketOverviewContainer.displayName = 'MarketOverviewContainer';

export default MarketOverviewContainer;