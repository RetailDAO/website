// Performance-optimized Market Overview container
import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePerformanceTracking } from '../../utils/performance';
import useIntersectionObserver from './hooks/useIntersectionObserver';
import GridLayout from './layout/GridLayout';
import CardContainer from './layout/CardContainer';
import Sidebarv2 from './Sidebarv2';
import { 
  MovingAveragesSkeleton
} from './layout/OptimizedSkeletons';

// Lazy load all 6 cards
const MovingAveragesCard = lazy(() => import('./cards/MovingAveragesCard'));
const LiquidityPulseCard = lazy(() => import('./cards/LiquidityPulseCard'));
const StateOfLeverageCard = lazy(() => import('./cards/StateOfLeverageCard'));
const FuturesBasisCard = lazy(() => import('./cards/FuturesBasisCard'));
const RotationBreadthCard = lazy(() => import('./cards/RotationBreadthCard'));
const ETFFlowsCard = lazy(() => import('./cards/ETFFlowsCard'));

const MarketOverviewContainer = React.memo(() => {
  const { colors, cycleTheme, themeName } = useTheme();
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // Performance tracking for the entire container
  usePerformanceTracking('MarketOverviewContainer');

  // Card configuration - all 6 cards (Priority 1-6) for hero section layout
  const cardConfigs = useMemo(() => [
    { 
      id: 'moving-averages', 
      component: MovingAveragesCard,
      skeleton: MovingAveragesSkeleton,
      size: 'medium',
      priority: 1, // Load first (fastest API, simple UI)
      estimatedLoadTime: 100,
      name: 'Moving Averages'
    },
    { 
      id: 'liquidity-pulse', 
      component: LiquidityPulseCard,
      skeleton: MovingAveragesSkeleton, // Uniform skeleton for all cards
      size: 'medium', // Standardized size
      priority: 2, // FRED API with 30min cache, sparkline not full chart
      estimatedLoadTime: 200,
      name: 'Liquidity Pulse'
    },
    { 
      id: 'leverage-state', 
      component: StateOfLeverageCard,
      skeleton: MovingAveragesSkeleton, // Uniform skeleton for all cards
      size: 'medium', // Standardized size
      priority: 3, // Mock data for now, 3min cache, traffic light UI
      estimatedLoadTime: 150,
      name: 'State of Leverage'
    },
    { 
      id: 'futures-basis', 
      component: FuturesBasisCard,
      skeleton: MovingAveragesSkeleton, // Uniform skeleton for all cards
      size: 'medium', // Standardized size
      priority: 4, // Mock data, basis calculation UI
      estimatedLoadTime: 120,
      name: 'Futures Basis'
    },
    { 
      id: 'rotation-breadth', 
      component: RotationBreadthCard,
      skeleton: MovingAveragesSkeleton, // Uniform skeleton for all cards
      size: 'medium', // Standardized size
      priority: 5, // Mock data, gauge UI
      estimatedLoadTime: 140,
      name: 'Rotation Breadth'
    },
    { 
      id: 'etf-flows', 
      component: ETFFlowsCard,
      skeleton: MovingAveragesSkeleton, // Uniform skeleton for all cards
      size: 'medium', // Standardized size
      priority: 6, // Mock data, bar chart UI
      estimatedLoadTime: 180,
      name: 'ETF Flows'
    }
  ], []);

  // Cache-first loading: Load all cards immediately since data is pre-cached
  React.useEffect(() => {
    // Load all cards immediately for cache-first performance
    const allCardIds = cardConfigs.map(config => config.id);
    console.log('🚀 Cache-first: Loading all cards immediately', allCardIds);
    setVisibleCards(new Set(allCardIds));
    
    // Track loading performance for all cards
    const loadStart = performance.now();
    const metrics = {};
    allCardIds.forEach(cardId => {
      metrics[cardId] = { loadStart };
    });
    setPerformanceMetrics(metrics);
  }, [cardConfigs]);

  // Progressive loading with intersection observer (DISABLED FOR CACHE-FIRST)
  const { ref: containerRef } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    onIntersect: () => {} // Disabled since we load everything immediately
  });

  return (
    <div ref={containerRef} className={`market-overview-container ${colors.bg.primary} min-h-screen`}>
      {/* Interactive Terminal Sidebar */}
      <Sidebarv2 />
      {/* Terminal-style header with theme switcher - compact */}
      <header className="mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${colors.text.primary} tracking-wide`}>
              MARKET OVERVIEW
            </h1>
            <p className={`text-xs md:text-sm ${colors.text.muted} mt-1 font-mono`}>
              [INSTITUTIONAL-GRADE ANALYSIS] • REAL-TIME
            </p>
          </div>
          
          {/* Terminal theme switcher and performance indicator */}
          <div className="flex items-center space-x-6">
            {/* Theme switcher with clear description */}
            <div className="text-center">
              <button
                onClick={cycleTheme}
                className={`
                  px-4 py-2 text-xs font-mono uppercase tracking-wider
                  ${colors.border.primary} border-2 rounded-none
                  ${colors.text.accent} ${colors.bg.hover}
                  transition-all duration-200 hover:scale-105
                  focus:outline-none focus:ring-2 focus:ring-orange-500/50
                `}
                title={`Toggle Terminal Theme (Current: ${themeName})\nCycle: Traditional → High Contrast → Retro Terminal`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-[10px] opacity-60">TOGGLE THEME</span>
                  <span className="font-semibold">[{themeName.toUpperCase()}]</span>
                </div>
              </button>
            </div>
            
            {/* Performance indicator */}
            {Object.keys(performanceMetrics).length > 0 && (
              <div className={`text-xs ${colors.text.muted} flex items-center space-x-3 font-mono`}>
                <div className="flex space-x-1">
                  {cardConfigs.map(config => (
                    <div
                      key={config.id}
                      className={`w-2 h-2 rounded-none ${
                        visibleCards.has(config.id) 
                          ? colors.text.positive.replace('text-', 'bg-')
                          : 'bg-gray-700'
                      }`}
                      title={`${config.id.toUpperCase()}: ${visibleCards.has(config.id) ? 'ONLINE' : 'LOADING'}`}
                    />
                  ))}
                </div>
                <span className={colors.text.secondary}>
                  [{visibleCards.size}/{cardConfigs.length}] MODULES_LOADED
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Terminal-style divider */}
        <div className={`mt-4 h-px ${colors.border.primary}`}></div>
      </header>

      {/* Terminal-style grid layout with cards */}
      <div className="px-4">
        <GridLayout>
          {cardConfigs
            .sort((a, b) => a.priority - b.priority) // Load by priority order
            .map(({ id, component: Component, skeleton: Skeleton, size }) => (
              <CardContainer 
                key={id}
                size={size}
                data-card-id={id}
                className={`${colors.bg.card} ${colors.border.primary} border-0 ${colors.shadow.card}`}
                style={{
                  // Optimized height for hero section fit
                  minHeight: '280px',
                  maxHeight: '320px',
                  borderRadius: '12px' // Modern rounded corners
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
      </div>

      {/* Terminal-style development performance panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`mt-8 mx-6 p-6 ${colors.bg.secondary} ${colors.border.primary} border-0 rounded-xl`}>
          <h3 className={`text-lg font-mono uppercase tracking-wider ${colors.text.primary} mb-4`}>
            [SYSTEM_PERFORMANCE_METRICS]
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div className={colors.text.secondary}>
              <span className={colors.text.muted}>BUNDLE_TARGET:</span> <span className={colors.text.highlight}>&lt;350KB</span>
            </div>
            <div className={colors.text.secondary}>
              <span className={colors.text.muted}>TBT_TARGET:</span> <span className={colors.text.highlight}>&lt;200ms</span>
            </div>
            <div className={colors.text.secondary}>
              <span className={colors.text.muted}>MODULES_LOADED:</span> <span className={colors.text.positive}>{visibleCards.size}/{cardConfigs.length}</span>
            </div>
            <div className={colors.text.secondary}>
              <span className={colors.text.muted}>LIGHTHOUSE_TARGET:</span> <span className={colors.text.highlight}>85+</span>
            </div>
          </div>
          <div className={`mt-4 pt-4 border-t ${colors.border.primary} text-xs font-mono ${colors.text.muted}`}>
            EXECUTE: <code className={`${colors.text.accent} px-1`}>npm run perf:monitor</code> TO_VERIFY_METRICS
          </div>
        </div>
      )}
    </div>
  );
});

MarketOverviewContainer.displayName = 'MarketOverviewContainer';

export default MarketOverviewContainer;