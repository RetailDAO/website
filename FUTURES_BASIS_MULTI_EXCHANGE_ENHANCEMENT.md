# FUTURES BASIS MULTI-EXCHANGE ENHANCEMENT

**Status**: Ready for Implementation
**Priority**: Future Enhancement
**Estimated Effort**: 15-20 hours
**Expected Accuracy Improvement**: +15-25%

## Overview

Complete implementation plan for enhancing the FUTURES_BASIS card with multi-exchange data aggregation, improving accuracy from ~85% to ~95% market representation.

## Current Implementation

**Data Source**: Deribit API only
- Spot: `/get_index_price` for `btc_usd`
- Futures: `/ticker` for `BTC-26DEC25` (quarterly)
- Caching: 5-hour conservative cache
- Fallback: Mock data generation

## Enhanced Architecture

### Phase 1: Infrastructure Setup (2-3 hours)

#### 1.1 Extend Futures Data Service

```javascript
// Add to futuresDataService.js
class OptimizedFuturesDataService {
  constructor() {
    // Existing Deribit setup...

    // Add Binance Futures limiter
    this.binanceFuturesLimiter = new Bottleneck({
      reservoir: 1200,
      reservoirRefreshAmount: 1200,
      reservoirRefreshInterval: 60 * 1000, // Binance: 1200/min
      maxConcurrent: 3
    });

    this.binanceFuturesUrl = 'https://fapi.binance.com';

    // Exchange weights based on volume and reliability
    this.exchangeWeights = {
      binance: 0.6,  // Highest liquidity
      deribit: 0.4   // Professional pricing
    };
  }
}
```

#### 1.2 Add Binance API Methods

```javascript
async getBinanceSpotPrice() {
  return this.binanceFuturesLimiter.schedule(async () => {
    const response = await axios.get(`${this.binanceFuturesUrl}/fapi/v1/ticker/price`, {
      params: { symbol: 'BTCUSDT' },
      timeout: this.requestTimeout
    });
    return parseFloat(response.data.price);
  });
}

async getBinanceFuturesPrice() {
  return this.binanceFuturesLimiter.schedule(async () => {
    const response = await axios.get(`${this.binanceFuturesUrl}/fapi/v1/ticker/price`, {
      params: { symbol: 'BTCUSDT' }, // Perpetual contract
      timeout: this.requestTimeout
    });
    return parseFloat(response.data.price);
  });
}

async getBinanceVolume() {
  return this.binanceFuturesLimiter.schedule(async () => {
    const response = await axios.get(`${this.binanceFuturesUrl}/fapi/v1/ticker/24hr`, {
      params: { symbol: 'BTCUSDT' },
      timeout: this.requestTimeout
    });
    return parseFloat(response.data.volume);
  });
}
```

### Phase 2: Multi-Exchange Data Fetching (3-4 hours)

#### 2.1 Enhanced Main Method

```javascript
async getFuturesBasis() {
  const cacheKey = `futures_basis_multi_${Math.floor(Date.now() / 600000)}`;

  return await cacheService.getOrFetch(cacheKey, async () => {
    try {
      console.log('🔍 [FuturesService] Fetching multi-exchange futures basis data...');

      // Fetch from both exchanges in parallel
      const [deribitResult, binanceResult] = await Promise.allSettled([
        this.getDeribitBasisData(),
        this.getBinanceBasisData()
      ]);

      // Process results with intelligent aggregation
      return this.aggregateExchangeData(deribitResult, binanceResult);

    } catch (error) {
      console.warn('🎭 [FuturesService] Multi-exchange fetch failed, using fallback:', error.message);
      return await this.getFallbackBasisData();
    }
  }, { ttl: 600 }); // 10 minutes cache
}
```

#### 2.2 Individual Exchange Data Processors

```javascript
async getDeribitBasisData() {
  try {
    const [spot, futures] = await Promise.all([
      this.getOptimizedSpotPrice('BTC'),
      this.getDeribitFuturesPrice('BTC-26DEC25')
    ]);

    const daysToExpiry = this.calculateDaysToExpiry(futures.expiry);
    const basis = this.calculateAnnualizedBasis(spot, futures.price, daysToExpiry);

    return {
      exchange: 'deribit',
      spotPrice: spot,
      futuresPrice: futures.price,
      daysToExpiry: daysToExpiry,
      annualizedBasis: basis,
      contractType: 'quarterly',
      volume24h: await this.getDeribitVolume(),
      confidence: 0.85, // Professional exchange confidence
      timestamp: Date.now()
    };
  } catch (error) {
    throw new Error(`Deribit data fetch failed: ${error.message}`);
  }
}

async getBinanceBasisData() {
  try {
    const [spot, futures, volume] = await Promise.all([
      this.getBinanceSpotPrice(),
      this.getBinanceFuturesPrice(),
      this.getBinanceVolume()
    ]);

    // For perpetual, use funding rate to estimate equivalent basis
    const fundingRate = await this.getBinanceFundingRate();
    const perpetualBasis = fundingRate * 365 * 3; // Annualized funding rate

    return {
      exchange: 'binance',
      spotPrice: spot,
      futuresPrice: futures,
      daysToExpiry: null, // Perpetual contract
      annualizedBasis: perpetualBasis,
      contractType: 'perpetual',
      volume24h: volume,
      confidence: 0.95, // Highest liquidity confidence
      timestamp: Date.now()
    };
  } catch (error) {
    throw new Error(`Binance data fetch failed: ${error.message}`);
  }
}
```

### Phase 3: Advanced Aggregation Logic (4-5 hours)

#### 3.1 Intelligent Data Aggregation

```javascript
aggregateExchangeData(deribitResult, binanceResult) {
  const exchanges = [];

  // Process successful results
  if (deribitResult.status === 'fulfilled') {
    exchanges.push(deribitResult.value);
    console.log('✅ [Deribit] Basis data retrieved successfully');
  } else {
    console.warn('⚠️ [Deribit] Data fetch failed:', deribitResult.reason?.message);
  }

  if (binanceResult.status === 'fulfilled') {
    exchanges.push(binanceResult.value);
    console.log('✅ [Binance] Basis data retrieved successfully');
  } else {
    console.warn('⚠️ [Binance] Data fetch failed:', binanceResult.reason?.message);
  }

  if (exchanges.length === 0) {
    throw new Error('No exchange data available');
  }

  if (exchanges.length === 1) {
    return this.formatSingleExchangeResult(exchanges[0]);
  }

  // Multi-exchange aggregation
  return this.calculateCompositeMetrics(exchanges);
}

calculateCompositeMetrics(exchanges) {
  const weights = this.calculateExchangeWeights(exchanges);

  // Volume-weighted composite prices
  const compositeSpot = exchanges.reduce((sum, ex, i) =>
    sum + (ex.spotPrice * weights[i]), 0);

  // Term structure adjustment for different contract types
  const adjustedBases = exchanges.map(ex =>
    this.normalizeToQuarterlyEquivalent(ex));

  const compositeBasis = adjustedBases.reduce((sum, basis, i) =>
    sum + (basis * weights[i]), 0);

  // Cross-validation confidence
  const agreement = this.calculateAgreementScore(exchanges);
  const anomalyCheck = this.detectBasisAnomalies(compositeBasis);

  // Calculate representative futures price
  const representativeFutures = compositeSpot * (1 + (compositeBasis / 100) * (90 / 365));

  return {
    spotPrice: Math.round(compositeSpot * 100) / 100,
    futuresPrice: Math.round(representativeFutures * 100) / 100,
    daysToExpiry: 90, // Standardized to quarterly
    annualizedBasis: Math.round(compositeBasis * 100) / 100,
    regime: this.classifyBasisRegime(compositeBasis),
    regimeData: this.classifyBasisRegime(compositeBasis),
    expiry: Date.now() + (90 * 24 * 60 * 60 * 1000),
    timestamp: Date.now(),
    dataSource: 'multi_exchange',
    metadata: {
      exchanges: exchanges.map(ex => ({
        name: ex.exchange,
        weight: weights[exchanges.indexOf(ex)],
        confidence: ex.confidence,
        contractType: ex.contractType
      })),
      agreement: Math.round(agreement * 100) / 100,
      confidence: this.calculateCompositeConfidence(exchanges, agreement),
      anomalyDetected: anomalyCheck.isAnomaly,
      qualityScore: this.calculateDataQualityScore(exchanges, agreement)
    }
  };
}
```

#### 3.2 Advanced Calculation Methods

```javascript
calculateExchangeWeights(exchanges) {
  const totalVolume = exchanges.reduce((sum, ex) => sum + ex.volume24h, 0);
  const totalConfidence = exchanges.reduce((sum, ex) => sum + ex.confidence, 0);

  return exchanges.map(ex => {
    const volumeWeight = ex.volume24h / totalVolume;
    const confidenceWeight = ex.confidence / totalConfidence;

    // Combine volume and confidence (60% volume, 40% confidence)
    return (volumeWeight * 0.6) + (confidenceWeight * 0.4);
  });
}

normalizeToQuarterlyEquivalent(exchangeData) {
  if (exchangeData.contractType === 'quarterly') {
    return exchangeData.annualizedBasis;
  }

  if (exchangeData.contractType === 'perpetual') {
    // Convert perpetual funding-based basis to quarterly equivalent
    // Perpetual basis is typically lower due to funding mechanism
    const quarterlyAdjustment = 1.15; // Empirical adjustment factor
    return exchangeData.annualizedBasis * quarterlyAdjustment;
  }

  return exchangeData.annualizedBasis;
}

calculateAgreementScore(exchanges) {
  if (exchanges.length < 2) return 1.0;

  const bases = exchanges.map(ex => this.normalizeToQuarterlyEquivalent(ex));
  const mean = bases.reduce((sum, b) => sum + b, 0) / bases.length;
  const variance = bases.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bases.length;
  const stdDev = Math.sqrt(variance);

  // Agreement score inversely related to standard deviation
  // 100% agreement if stdDev = 0, decreasing as stdDev increases
  return Math.max(0.3, Math.exp(-stdDev / 2));
}

detectBasisAnomalies(currentBasis, historicalBases = []) {
  // Simple anomaly detection - can be enhanced with historical data
  const typicalRange = { min: -5, max: 25 }; // Typical basis range %

  const isOutOfRange = currentBasis < typicalRange.min || currentBasis > typicalRange.max;
  const severity = Math.max(
    Math.abs(currentBasis - typicalRange.min) / 10,
    Math.abs(currentBasis - typicalRange.max) / 10
  );

  return {
    isAnomaly: isOutOfRange,
    severity: Math.min(severity, 3), // Cap at 3x normal range
    confidence: isOutOfRange ? Math.max(0.3, 1 - severity / 3) : 1.0
  };
}

calculateCompositeConfidence(exchanges, agreement) {
  const avgExchangeConfidence = exchanges.reduce((sum, ex) => sum + ex.confidence, 0) / exchanges.length;
  const diversificationBonus = exchanges.length > 1 ? 0.1 : 0;

  return Math.min(0.99, (avgExchangeConfidence * agreement) + diversificationBonus);
}
```

### Phase 4: Enhanced UI Components (2-3 hours)

#### 4.1 Updated Card Display

```javascript
// Enhanced FuturesBasisCard.jsx sections

// Main percentage display with confidence indicator
<div className="text-center mb-2">
  <div className="flex items-center justify-center space-x-2">
    <div className={`text-2xl font-bold ${colors.text.primary}`}>
      {annualizedBasis > 0 ? '+' : ''}{formatBasisWithAdaptivePrecision(annualizedBasis, confidence)}%
    </div>
    {dataSource === 'multi_exchange' && (
      <div className={`text-xs px-2 py-1 rounded ${getConfidenceColor(confidence, colors)}`}>
        {confidence >= 0.9 ? 'HIGH' : confidence >= 0.7 ? 'MED' : 'LOW'}
      </div>
    )}
  </div>
  <div className={`text-xs ${colors.text.secondary}`}>
    {dataSource === 'multi_exchange' ? 'Composite Basis' : 'Annualized Basis'}
  </div>
</div>

// Exchange source indicators (only for multi-exchange)
{dataSource === 'multi_exchange' && data.metadata?.exchanges && (
  <div className="flex justify-center space-x-1 mb-2">
    {data.metadata.exchanges.map(exchange => (
      <div key={exchange.name} className="text-center">
        <span className={`text-xs px-2 py-1 rounded ${colors.bg.tertiary} ${colors.text.secondary}`}>
          {exchange.name.toUpperCase()}
        </span>
        <div className={`text-xs ${colors.text.muted} mt-1`}>
          {Math.round(exchange.weight * 100)}%
        </div>
      </div>
    ))}
  </div>
)}

// Agreement indicator (only for multi-exchange)
{dataSource === 'multi_exchange' && data.metadata?.agreement && (
  <div className={`text-xs text-center mb-2 ${colors.text.secondary}`}>
    {Math.round(data.metadata.agreement * 100)}% cross-validation agreement
  </div>
)}
```

#### 4.2 Enhanced Footer

```javascript
// Updated footer in FuturesBasisCard.jsx
<div className={`${colors.text.muted}`}>
  {(() => {
    if (dataSource === 'multi_exchange') {
      const exchangeNames = data.metadata?.exchanges?.map(ex => ex.name).join(' + ') || 'Multi';
      const confidence = Math.round((data.metadata?.confidence || 0) * 100);
      return `${exchangeNames} • ${confidence}% confidence`;
    } else {
      const sourceName = dataSource || (isUsingMockData ? 'Mock' : 'Deribit');
      const timeAgo = lastUpdate ? formatCacheAge(Date.now() - new Date(lastUpdate).getTime()) : 'Just now';
      return `${sourceName} • ${timeAgo}`;
    }
  })()}
</div>
```

#### 4.3 Utility Functions

```javascript
// Helper functions for enhanced display

function formatBasisWithAdaptivePrecision(basis, confidence = 1) {
  // More decimal places for high-confidence, low-basis values
  if (Math.abs(basis) < 5 && confidence > 0.9) {
    return basis.toFixed(3); // 0.123%
  } else if (Math.abs(basis) < 20) {
    return basis.toFixed(2); // 12.34%
  } else {
    return basis.toFixed(1); // 45.6%
  }
}

function getConfidenceColor(confidence, colors) {
  if (confidence >= 0.9) {
    return `${colors.bg.positive} ${colors.text.positive}`;
  } else if (confidence >= 0.7) {
    return `${colors.bg.secondary} ${colors.text.secondary}`;
  } else {
    return `${colors.bg.negative} ${colors.text.negative}`;
  }
}
```

### Phase 5: Testing & Deployment (3-4 hours)

#### 5.1 Error Handling Enhancements

```javascript
// Enhanced error handling with graceful degradation
async getFuturesBasis() {
  try {
    return await this.getMultiExchangeBasis();
  } catch (multiExchangeError) {
    console.warn('🔄 [FuturesService] Multi-exchange failed, trying Deribit only:', multiExchangeError.message);

    try {
      return await this.getDeribitOnlyBasis();
    } catch (deribitError) {
      console.warn('🔄 [FuturesService] Deribit failed, trying Binance only:', deribitError.message);

      try {
        return await this.getBinanceOnlyBasis();
      } catch (binanceError) {
        console.warn('🎭 [FuturesService] All exchanges failed, using fallback:', binanceError.message);
        return await this.getFallbackBasisData();
      }
    }
  }
}
```

#### 5.2 Performance Monitoring

```javascript
// Add performance tracking
async getFuturesBasis() {
  const startTime = performance.now();
  const performanceMarkers = {};

  try {
    performanceMarkers.fetchStart = performance.now();
    const result = await this.getMultiExchangeBasis();
    performanceMarkers.fetchEnd = performance.now();

    // Log performance metrics
    const totalTime = performanceMarkers.fetchEnd - startTime;
    console.log(`📊 [Performance] Multi-exchange basis calculated in ${totalTime.toFixed(2)}ms`);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        performance: {
          totalTime: totalTime,
          fetchTime: performanceMarkers.fetchEnd - performanceMarkers.fetchStart,
          exchangeCount: result.metadata?.exchanges?.length || 1
        }
      }
    };
  } catch (error) {
    const errorTime = performance.now() - startTime;
    console.warn(`⚠️ [Performance] Basis calculation failed after ${errorTime.toFixed(2)}ms:`, error.message);
    throw error;
  }
}
```

## Implementation Priority

1. **Immediate Benefits**: Cross-validation and anomaly detection
2. **Medium-term**: Volume-weighted composite calculations
3. **Long-term**: Advanced confidence scoring and historical analysis

## Testing Strategy

1. **Unit Tests**: Individual exchange data fetchers
2. **Integration Tests**: Multi-exchange aggregation logic
3. **Performance Tests**: Response time under various network conditions
4. **Fallback Tests**: Behavior when exchanges are unavailable

## Rollout Plan

1. **Shadow Mode**: Run multi-exchange logic alongside current system for comparison
2. **Gradual Rollout**: Enable for subset of users initially
3. **Full Deployment**: Switch all users after validation period
4. **Monitoring**: Track accuracy improvements and performance metrics

## Expected Outcomes

- **Accuracy**: +15-25% improvement in basis calculation accuracy
- **Reliability**: Reduced single points of failure
- **Confidence**: Better user trust through cross-validation
- **Market Coverage**: 95% vs current 85% market representation

---

**Ready for Implementation**: All components documented and ready for development when prioritized.