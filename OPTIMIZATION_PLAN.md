# RetailDAO API Optimization Plan

## Overview
Transform the current request-response architecture to a WebSocket-first streaming system to reduce API calls by 70-80% while improving real-time data delivery and staying within free-tier API limits.

## Current State Analysis ✅
- [x] Backend API structure and rate limiting analyzed
- [x] Frontend data fetching patterns reviewed  
- [x] WebSocket implementation assessed (underutilized)
- [x] Caching system and fallback mechanisms evaluated
- [x] Technical indicator calculations reviewed

## Phase 1: WebSocket-First Data Architecture ⚡

### 1.1 Enhanced WebSocket Service (Backend)
- [x] **Extend websocketService.js to stream calculated indicators**
  - [x] Add RSI streaming (14, 21, 30 periods)
  - [x] Add Moving Average streaming (20, 50, 100, 200 periods)
  - [ ] Add Bollinger Bands streaming
  - [ ] Add MACD streaming
  - [x] Implement indicator calculation caching
  - [x] Add differential updates (only send changed values)

- [x] **Create indicator streaming controller**
  - [x] File: `backend/src/controllers/indicatorStreamController.js`
  - [x] Stream pre-calculated indicators every 5 minutes
  - [x] Manage multiple symbols (BTC, ETH, SOL)
  - [x] Handle client subscriptions per symbol
  - [x] Added WebSocket endpoint `/ws/indicators`

- [x] **Optimize WebSocket message format**
  - [x] Compact JSON structure for indicators
  - [x] Differential updates (only significant changes)
  - [x] Symbol-specific indicator broadcasting

### 1.2 WebSocket Data Integration (Frontend)
- [x] **Enhance useWebSocket.js hook**
  - [x] Add indicator subscription management with auto-subscribe
  - [x] Implement data merging with cached data
  - [x] Add connection health monitoring with ping/pong
  - [x] Handle partial data updates and API fallbacks

- [x] **Create useIndicatorStream hook**
  - [x] File: `frontend/src/hooks/useWebSocket.js` (enhanced existing)
  - [x] Subscribe to specific symbol indicators
  - [x] Merge real-time with historical data
  - [x] Provide loading states and health monitoring

- [x] **Create useIndicatorData hook**
  - [x] File: `frontend/src/hooks/useIndicatorData.js`
  - [x] Seamless WebSocket + API integration
  - [x] Single symbol and multi-symbol support
  - [x] Real-time price streaming hook

- [ ] **Update chart components to use streaming data**
  - [ ] Modify RSI components to use streams
  - [ ] Update Moving Average charts
  - [ ] Implement real-time chart updates

## Phase 2: Intelligent Caching Strategy 🧠

### 2.1 Smart Cache Warming
- [ ] **Implement background cache warming service**
  - [ ] File: `backend/src/services/cache/cacheWarmingService.js`
  - [ ] Schedule warming during low-traffic periods
  - [ ] Prioritize frequently accessed symbols/timeframes
  - [ ] Monitor cache hit rates and adjust strategy

- [ ] **Add stale-while-revalidate pattern**
  - [ ] Serve cached data immediately
  - [ ] Refresh data in background
  - [ ] Update clients via WebSocket when fresh data available

### 2.2 Differential Caching
- [ ] **Implement change detection for indicators**
  - [ ] Compare current vs previous indicator values
  - [ ] Only cache and stream significant changes (>1% for prices, >5% for RSI)
  - [ ] Reduce redundant calculations and transmissions

- [ ] **Add cache versioning system**
  - [ ] Track data freshness per indicator
  - [ ] Implement cache invalidation strategies
  - [ ] Handle graceful degradation

## Phase 3: API Call Reduction 📉

### 3.1 Request Optimization
- [ ] **Consolidate API endpoints**
  - [ ] Single `/api/v1/crypto/realtime-stream` endpoint
  - [ ] Batch multiple symbol requests
  - [ ] Reduce polling frequency (5min → 10min for stable data)

- [ ] **Implement request deduplication**
  - [ ] Track in-flight requests
  - [ ] Share results across multiple clients
  - [ ] Add request coalescing for similar timeframes

### 3.2 WebSocket-First Frontend Architecture  
- [ ] **Modify API service to prioritize WebSocket**
  - [ ] Check WebSocket data first
  - [ ] Fall back to API only for missing data
  - [ ] Implement "WebSocket + API hybrid" pattern

- [ ] **Update data fetching strategy in components**
  - [ ] Replace polling with WebSocket subscriptions
  - [ ] Use API only for initial page load
  - [ ] Implement optimistic updates

## Phase 4: Enhanced Fallback System 🛡️

### 4.1 Smart Mock Data Generation
- [ ] **Enhance mock data system**
  - [ ] Use WebSocket real-time data as baseline
  - [ ] Apply realistic market volatility patterns
  - [ ] Maintain indicator relationships (price vs RSI correlation)

- [ ] **Implement gradual degradation**
  - [ ] Real data → Mixed (real price + calculated indicators) → Full mock
  - [ ] Visual indicators for data source quality
  - [ ] Automatic recovery when APIs restore

### 4.2 Data Source Transparency
- [ ] **Add data source indicators to UI**
  - [ ] Real-time badges (🟢 Live, 🟡 Cached, 🔴 Mock)
  - [ ] Timestamp of last real data
  - [ ] Connection status indicators

- [ ] **Implement user notifications**
  - [ ] Toast notifications for data source changes
  - [ ] Graceful error handling and recovery
  - [ ] Option to refresh data manually

## Phase 5: Monitoring & Performance 📊

### 5.1 Metrics Collection
- [ ] **Add comprehensive monitoring**
  - [ ] Track API call reduction percentage
  - [ ] Monitor WebSocket connection stability
  - [ ] Cache hit/miss ratios per data type
  - [ ] Real-time data freshness metrics

- [ ] **Create performance dashboard**
  - [ ] File: `backend/src/routes/metrics.js`
  - [ ] API usage statistics
  - [ ] WebSocket connection health
  - [ ] Cache performance metrics

### 5.2 Load Testing & Optimization
- [ ] **Stress test WebSocket connections**
  - [ ] Multiple concurrent clients
  - [ ] High-frequency indicator updates
  - [ ] Connection drop/recovery scenarios

- [ ] **Optimize for production deployment**
  - [ ] WebSocket scaling considerations
  - [ ] Redis cluster for cache scaling
  - [ ] CDN integration for static indicator data

## Implementation Timeline

### ✅ Week 1: WebSocket Enhancement (COMPLETED)
- [x] Backend WebSocket service enhancement
- [x] Indicator streaming implementation  
- [x] Frontend WebSocket integration with hooks

### Week 2: Component Integration & Optimization  
- [ ] Update existing components to use WebSocket data
- [ ] Add Bollinger Bands and MACD indicators
- [ ] Cache warming service implementation
- [ ] Request deduplication

### Week 3: Advanced Features
- [ ] Enhanced mock data system
- [ ] UI data source indicators
- [ ] Performance monitoring dashboard

### Week 4: Testing & Refinement
- [ ] Load testing
- [ ] Performance optimization
- [ ] Documentation updates

## Success Metrics 🎯

### Primary Goals
- [ ] **70-80% reduction in external API calls**
- [ ] **Sub-2 second real-time data updates**
- [ ] **>95% uptime with fallback system**
- [ ] **Stay within free-tier API limits**

### Secondary Goals  
- [ ] **<100ms WebSocket message latency**
- [ ] **>90% cache hit rate for indicators**
- [ ] **Seamless real-to-mock data transitions**
- [ ] **Zero data interruptions during API failures**

## Files to Create/Modify

### New Files
- [x] `backend/src/controllers/indicatorStreamController.js`
- [x] `frontend/src/hooks/useIndicatorData.js`
- [ ] `backend/src/services/cache/cacheWarmingService.js`
- [ ] `backend/src/routes/metrics.js`

### Files Modified
- [x] `backend/src/services/websocket/websocketService.js` (enhanced with indicators)
- [x] `frontend/src/hooks/useWebSocket.js` (added useIndicatorStream)
- [x] `backend/src/routes/api.js` (added indicator streaming routes)
- [x] `backend/server.js` (added WebSocket server integration)
- [ ] `frontend/src/services/api.js` (pending component integration)
- [ ] `backend/src/services/dataProviders/cryptoDataservice.js` (pending optimizations)
- [ ] `backend/src/services/cache/cacheService.js` (pending warming service)

## Notes & Considerations

### Technical Debt
- Current WebSocket only streams prices, not calculated indicators
- Frontend makes redundant API calls despite backend optimization
- Indicators calculated multiple times instead of cached

### Risk Mitigation
- Implement gradual rollout with feature flags
- Maintain backward compatibility during transition
- Add circuit breakers for WebSocket failures
- Monitor API usage closely during implementation

### Performance Considerations
- WebSocket message size optimization
- Redis memory usage for indicator caching
- Client-side memory management for real-time data
- Graceful handling of slow connections

---

**Last Updated**: `[CURRENT_DATE]`  
**Status**: Ready to implement  
**Estimated Completion**: 3-4 weeks  
**Priority**: High (API usage optimization)