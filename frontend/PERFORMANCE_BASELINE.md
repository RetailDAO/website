# Performance Baseline - Market Overview v2

## Current Bundle Analysis (Before Optimization)

### Bundle Sizes
- **Total Bundle Size:** ~932 KB (compressed: ~255 KB)
  - `index-DfsP36uW.js`: 745.85 kB (gzip: 202.07 kB) ⚠️ **CRITICAL**
  - `vendor-B1sUnLqs.js`: 142.30 kB (gzip: 45.66 kB) 
  - `index-B9gbc08A.css`: 43.47 kB (gzip: 7.26 kB)
  - `recharts-B1Esf6Tx.js`: 0.97 kB (gzip: 0.59 kB)

### Performance Issues Identified
1. **Main bundle (index) > 500KB** - Exceeds Vite's warning threshold
2. **No code splitting** - Everything loaded at once
3. **Large vendor bundle** - Libraries not optimally split
4. **Monolithic architecture** - Dashboard.jsx likely contains everything

## Performance Targets for Market Overview v2

### Bundle Size Targets
- [x] **Baseline:** 932 KB total
- [ ] **Target:** <350 KB total (62% reduction)
- [ ] **Individual chunks:** <200 KB each
- [ ] **Main bundle:** <150 KB (80% reduction from 746 KB)
- [ ] **Vendor bundle:** <100 KB (30% reduction from 142 KB)

### Core Web Vitals Targets
- [ ] **Lighthouse Score:** >85 (from current ~55)
- [ ] **Total Blocking Time:** <200ms (from current 2,900ms)
- [ ] **First Contentful Paint:** <1.8s (currently good at 588ms)
- [ ] **Largest Contentful Paint:** <2.5s (currently good at 608ms)
- [ ] **Cumulative Layout Shift:** <0.1 (from current 0.248)
- [ ] **Speed Index:** <1.5s (from current 2.4s)

## Performance Optimization Strategy

### Phase 1: Code Splitting (Week 1)
- [ ] Split Dashboard.jsx into lazy-loaded sections
- [ ] Dynamic imports for chart libraries (ApexCharts, Recharts)
- [ ] Route-based splitting for Market Overview components
- [ ] **Expected Impact:** 40-50% bundle reduction

### Phase 2: Component Optimization (Week 2-3)
- [ ] React.memo implementation across all cards
- [ ] useMemo for expensive calculations
- [ ] Chart optimization (disable animations, reduce data points)
- [ ] **Expected Impact:** 50-70% TBT reduction

### Phase 3: Advanced Optimization (Week 4)
- [ ] Tree shaking optimization
- [ ] Dead code elimination
- [ ] Progressive loading with intersection observers
- [ ] **Expected Impact:** Final push to 85+ Lighthouse score

## Monitoring Setup

### Performance Tools Installed
- ✅ `web-vitals` - Core Web Vitals monitoring
- ✅ `vite-bundle-analyzer` - Bundle size analysis
- ✅ `lighthouse-ci` - Automated Lighthouse audits

### Performance Scripts Added
```json
{
  "analyze": "vite-bundle-analyzer dist",
  "build:analyze": "npm run build && npm run analyze", 
  "lighthouse": "lighthouse http://localhost:3000 --output json --output html",
  "lighthouse:ci": "lhci autorun",
  "perf:test": "npm run build && npm run lighthouse",
  "perf:monitor": "npm run build:analyze && npm run lighthouse"
}
```

### Performance Budget Enforcement
- Lighthouse CI configured with strict thresholds
- Bundle size warnings at 500KB (already triggered)
- Component render time monitoring (>100ms alerts)
- API call monitoring (>2s alerts)

## Clean Architecture Plan

### Reusable Components (Keep)
- [ ] `ThemeContext.jsx` - Theme switching system
- [ ] `ErrorBoundary.jsx` - Error handling
- [ ] `LoadingToast.jsx` - Loading states
- [ ] `SkeletonLoader.jsx` - Skeleton screens (enhance for new cards)

### Components to Replace/Rewrite
- [ ] `Dashboard.jsx` → `MarketOverviewContainer.jsx` (clean rewrite)
- [ ] `BitcoinCard.jsx` → `MovingAveragesCard.jsx` (new functionality)
- [ ] `RSIGauge.jsx` → `StateOfLeverageCard.jsx` (new traffic light design)
- [ ] `DxyCard.jsx` → `LiquidityPulseCard.jsx` (US 2Y yield focus)

### New Components Architecture
```
src/components/MarketOverview/
├── MarketOverviewContainer.jsx (performance-optimized)
├── layout/
│   ├── GridLayout.jsx (CLS prevention)
│   └── CardContainer.jsx (standardized sizing)
├── cards/
│   ├── MovingAveragesCard.jsx (Quick Win #1)
│   ├── LiquidityPulseCard.jsx (Quick Win #2) 
│   ├── StateOfLeverageCard.jsx (Medium complexity)
│   ├── RotationBreadthCard.jsx (Medium complexity)
│   ├── ETFFlowsCard.jsx (High complexity)
│   └── FuturesBasisCard.jsx (High complexity)
└── hooks/
    ├── useOptimizedAPI.js (rate limiting + caching)
    ├── useIntersectionObserver.js (lazy loading)
    └── usePerformanceTracking.js (monitoring)
```

## Success Metrics

### Performance Targets Achievement
- [ ] **Bundle Size:** 932 KB → <350 KB (62% reduction)
- [ ] **TBT:** 2,900ms → <200ms (93% reduction)  
- [ ] **Lighthouse:** ~55 → 85+ (54% improvement)
- [ ] **Speed Index:** 2.4s → <1.5s (38% improvement)

### Business Goals Alignment
- [ ] 6 institutional-grade market indicators implemented
- [ ] Beginner-friendly status text for all indicators
- [ ] Professional terminal aesthetic maintained
- [ ] Weekly workflow integration ready
- [ ] Mobile performance excellent

---

**Next Steps:** Start with Performance-First Week 1 implementation
**Created:** $(date)
**Branch:** feature/market-overview-v2-perf