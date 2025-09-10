/**
 * Ultra-Conservative Circuit Breaker Service
 * 
 * Provides circuit breaker functionality for Market Overview v2 ultra-conservative caching strategy
 * Features:
 * - API failure protection with automatic fallback to stale cache
 * - Provider-specific circuit breakers for different API services
 * - Conservative failure thresholds to protect against rate limiting
 * - Automatic recovery detection and gradual re-enabling
 */

const cacheService = require('./cache/cacheService');

class CircuitBreakerService {
  constructor() {
    this.circuits = new Map();
    
    // Ultra-conservative circuit breaker configurations per API provider
    this.configs = {
      coingecko: {
        failureThreshold: 3,          // Trip after 3 failures (conservative)
        recoveryTimeout: 300000,      // 5 minutes before attempting recovery
        halfOpenRetries: 1,           // Only 1 retry when half-open
        description: 'CoinGecko API protection - ultra-conservative'
      },
      alpha_vantage: {
        failureThreshold: 2,          // Trip after 2 failures (very conservative)
        recoveryTimeout: 600000,      // 10 minutes before attempting recovery
        halfOpenRetries: 1,
        description: 'Alpha Vantage API protection - premium tier protection'
      },
      yahoo_finance: {
        failureThreshold: 3,
        recoveryTimeout: 300000,      // 5 minutes
        halfOpenRetries: 1,
        description: 'Yahoo Finance API protection'
      },
      binance: {
        failureThreshold: 5,          // More lenient for WebSocket
        recoveryTimeout: 60000,       // 1 minute
        halfOpenRetries: 2,
        description: 'Binance API protection'
      },
      bybit: {
        failureThreshold: 4,
        recoveryTimeout: 180000,      // 3 minutes
        halfOpenRetries: 1,
        description: 'Bybit API protection'
      },
      okx: {
        failureThreshold: 4,
        recoveryTimeout: 180000,      // 3 minutes
        halfOpenRetries: 1,
        description: 'OKX API protection'
      }
    };

    this.initializeCircuits();
  }

  initializeCircuits() {
    Object.keys(this.configs).forEach(provider => {
      this.circuits.set(provider, {
        state: 'CLOSED',              // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        lastSuccessTime: Date.now(),
        config: this.configs[provider],
        halfOpenAttempts: 0
      });
    });

    console.log('🛡️ Ultra-conservative circuit breakers initialized for Market Overview v2');
    console.log(`📊 Monitoring ${this.circuits.size} API providers with conservative thresholds`);
  }

  // Execute a request through the circuit breaker with ultra-conservative fallback
  async executeWithBreaker(provider, requestFn, dataType = null) {
    const circuit = this.circuits.get(provider);
    
    if (!circuit) {
      console.warn(`⚠️ No circuit breaker configured for ${provider}, executing directly`);
      return await requestFn();
    }

    // Check circuit state before making request
    const state = this.getCircuitState(circuit);
    
    if (state === 'OPEN') {
      console.log(`🚫 Circuit breaker OPEN for ${provider} - using ultra-conservative fallback`);
      return await this.getUltraConservativeFallback(provider, dataType);
    }

    if (state === 'HALF_OPEN') {
      console.log(`🔄 Circuit breaker HALF_OPEN for ${provider} - attempting recovery`);
    }

    try {
      // Attempt the request
      const result = await requestFn();
      
      // Success - reset circuit breaker
      this.onSuccess(circuit, provider);
      return result;
      
    } catch (error) {
      // Failure - update circuit breaker and get fallback
      this.onFailure(circuit, provider, error);
      
      console.log(`🎭 ${provider} request failed, using ultra-conservative fallback:`, error.message);
      return await this.getUltraConservativeFallback(provider, dataType);
    }
  }

  // Determine current circuit state based on configuration and timing
  getCircuitState(circuit) {
    const { state, lastFailureTime, config } = circuit;
    
    if (state === 'OPEN') {
      // Check if enough time has passed to attempt recovery
      if (Date.now() - lastFailureTime >= config.recoveryTimeout) {
        circuit.state = 'HALF_OPEN';
        circuit.halfOpenAttempts = 0;
        console.log(`🔄 Circuit breaker transitioning to HALF_OPEN (recovery attempt)`);
        return 'HALF_OPEN';
      }
      return 'OPEN';
    }
    
    return state;
  }

  // Handle successful request
  onSuccess(circuit, provider) {
    circuit.failureCount = 0;
    circuit.lastSuccessTime = Date.now();
    circuit.halfOpenAttempts = 0;
    
    if (circuit.state !== 'CLOSED') {
      circuit.state = 'CLOSED';
      console.log(`✅ Circuit breaker CLOSED for ${provider} - service recovered`);
    }
  }

  // Handle failed request
  onFailure(circuit, provider, error) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    
    // Log the failure with ultra-conservative context
    console.log(`💥 ${provider} failure ${circuit.failureCount}/${circuit.config.failureThreshold}: ${error.message}`);

    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenAttempts++;
      if (circuit.halfOpenAttempts >= circuit.config.halfOpenRetries) {
        circuit.state = 'OPEN';
        console.log(`🚫 Circuit breaker OPEN for ${provider} - recovery failed`);
      }
    } else if (circuit.failureCount >= circuit.config.failureThreshold) {
      circuit.state = 'OPEN';
      console.log(`🚫 Circuit breaker OPEN for ${provider} - threshold exceeded (ultra-conservative protection)`);
    }
  }

  // Get ultra-conservative fallback data with stale-while-revalidate pattern
  async getUltraConservativeFallback(provider, dataType) {
    try {
      console.log(`🎭 Activating ultra-conservative fallback for ${provider} (${dataType || 'unknown'})`);
      
      // Provider-specific fallback strategies
      switch (provider) {
        case 'coingecko':
          return await this.getCoinGeckoFallback(dataType);
        case 'alpha_vantage':
          return await this.getAlphaVantageFallback(dataType);
        case 'yahoo_finance':
          return await this.getYahooFallback(dataType);
        case 'binance':
        case 'bybit':
        case 'okx':
          return await this.getExchangeFallback(provider, dataType);
        default:
          return await this.getGenericFallback(dataType);
      }
    } catch (fallbackError) {
      console.error(`❌ Ultra-conservative fallback failed for ${provider}:`, fallbackError.message);
      return null;
    }
  }

  // CoinGecko-specific fallback (rotation breadth, price data)
  async getCoinGeckoFallback(dataType) {
    const fallbackKeys = [
      `market:rotation:breadth:top100_fallback`,
      `rotation_breadth_fallback`,
      `btc_benchmark_fallback`
    ];

    for (const key of fallbackKeys) {
      const cached = await cacheService.get(key);
      if (cached) {
        console.log(`🎯 CoinGecko fallback: Using cached ${key}`);
        return { ...cached, source: 'circuit_breaker_fallback', fresh: false };
      }
    }

    // Generate realistic mock data if no cache available
    return this.generateCoinGeckoMockData(dataType);
  }

  // Alpha Vantage fallback (US Treasury data)
  async getAlphaVantageFallback(dataType) {
    const fallbackKeys = [
      `market:liquidity:us2y_fallback`,
      `liquidity_pulse_fallback`,
      `treasury_DGS2_fallback`
    ];

    for (const key of fallbackKeys) {
      const cached = await cacheService.get(key);
      if (cached) {
        console.log(`🎯 Alpha Vantage fallback: Using cached ${key}`);
        return { ...cached, source: 'circuit_breaker_fallback', fresh: false };
      }
    }

    return this.generateAlphaVantageMockData(dataType);
  }

  // Yahoo Finance fallback (ETF data)
  async getYahooFallback(dataType) {
    const fallbackKeys = [
      `market:etf:flows:5d_fallback`,
      `etf_flows_fallback`
    ];

    for (const key of fallbackKeys) {
      const cached = await cacheService.get(key);
      if (cached) {
        console.log(`🎯 Yahoo Finance fallback: Using cached ${key}`);
        return { ...cached, source: 'circuit_breaker_fallback', fresh: false };
      }
    }

    return this.generateETFMockData(dataType);
  }

  // Exchange fallback (leverage data)
  async getExchangeFallback(provider, dataType) {
    const fallbackKeys = [
      `market:leverage:btc_fallback`,
      `leverage_state_fallback`,
      `market:futures:basis:3m_fallback`
    ];

    for (const key of fallbackKeys) {
      const cached = await cacheService.get(key);
      if (cached) {
        console.log(`🎯 ${provider} fallback: Using cached ${key}`);
        return { ...cached, source: 'circuit_breaker_fallback', fresh: false };
      }
    }

    return this.generateExchangeMockData(provider, dataType);
  }

  // Generic fallback for unknown providers
  async getGenericFallback(dataType) {
    console.log(`🎭 Generic fallback activated for dataType: ${dataType}`);
    return {
      error: 'Service temporarily unavailable',
      message: 'Using circuit breaker protection - data will be available when service recovers',
      source: 'circuit_breaker',
      timestamp: Date.now()
    };
  }

  // Generate realistic mock data for CoinGecko
  generateCoinGeckoMockData(dataType) {
    const mockRotationBreadth = 42 + (Math.random() - 0.5) * 20; // 32-52% range
    
    return {
      breadthPercentage: Math.round(mockRotationBreadth * 10) / 10,
      category: mockRotationBreadth < 35 ? 'BTC Season' : mockRotationBreadth > 55 ? 'Alt Season' : 'Neutral',
      coinsAnalyzed: 92,
      coinsBeatingBTC: Math.round(92 * (mockRotationBreadth / 100)),
      btcPerformance30d: -2.5 + (Math.random() - 0.5) * 5,
      source: 'circuit_breaker_mock',
      fresh: false,
      timestamp: Date.now()
    };
  }

  // Generate realistic mock data for Alpha Vantage  
  generateAlphaVantageMockData(dataType) {
    return {
      yieldValue: 4.2 + (Math.random() - 0.5) * 0.8, // 3.8-4.6% range
      trend: Math.random() > 0.5 ? 'rising' : 'falling',
      status: 'Neutral',
      description: 'Treasury yield data temporarily unavailable',
      source: 'circuit_breaker_mock',
      fresh: false,
      timestamp: Date.now()
    };
  }

  // Generate realistic mock data for ETFs
  generateETFMockData(dataType) {
    const mockFlow = (Math.random() - 0.3) * 600; // Bias toward positive flows
    
    return {
      inflow5D: Math.round(mockFlow * 10) / 10,
      status: mockFlow > 100 ? 'Sustained Inflows' : mockFlow < -100 ? 'Sustained Outflows' : 'Mixed',
      etfsAnalyzed: 4,
      source: 'circuit_breaker_mock',
      fresh: false,
      timestamp: Date.now()
    };
  }

  // Generate realistic mock data for exchanges
  generateExchangeMockData(provider, dataType) {
    const states = ['green', 'yellow', 'red'];
    const randomState = states[Math.floor(Math.random() * states.length)];
    
    return {
      state: randomState,
      stateLabel: randomState === 'green' ? 'Shorts Crowded' : randomState === 'red' ? 'Longs Crowded' : 'Balanced',
      openInterest: { total: 15 + Math.random() * 10, change24h: (Math.random() - 0.5) * 6 },
      fundingRate: { average: (Math.random() - 0.5) * 2 },
      source: 'circuit_breaker_mock',
      fresh: false,
      timestamp: Date.now()
    };
  }

  // Get circuit breaker status for monitoring
  getCircuitStatus() {
    const status = {};
    
    this.circuits.forEach((circuit, provider) => {
      const timeSinceLastFailure = circuit.lastFailureTime ? Date.now() - circuit.lastFailureTime : null;
      const timeSinceLastSuccess = Date.now() - circuit.lastSuccessTime;
      
      status[provider] = {
        state: circuit.state,
        failureCount: circuit.failureCount,
        config: circuit.config,
        timeSinceLastFailure: timeSinceLastFailure,
        timeSinceLastSuccess: timeSinceLastSuccess,
        healthStatus: circuit.state === 'CLOSED' ? 'healthy' : circuit.state === 'HALF_OPEN' ? 'recovering' : 'unhealthy',
        nextRecoveryAttempt: circuit.state === 'OPEN' && circuit.lastFailureTime ? 
          new Date(circuit.lastFailureTime + circuit.config.recoveryTimeout).toISOString() : null
      };
    });
    
    return {
      circuits: status,
      strategy: 'ultra_conservative',
      totalProviders: this.circuits.size,
      healthyProviders: Object.values(status).filter(s => s.state === 'CLOSED').length,
      openCircuits: Object.values(status).filter(s => s.state === 'OPEN').length,
      timestamp: new Date().toISOString()
    };
  }

  // Reset a specific circuit breaker (for admin/testing)
  resetCircuit(provider) {
    const circuit = this.circuits.get(provider);
    if (circuit) {
      circuit.state = 'CLOSED';
      circuit.failureCount = 0;
      circuit.lastFailureTime = null;
      circuit.lastSuccessTime = Date.now();
      circuit.halfOpenAttempts = 0;
      
      console.log(`🔄 Circuit breaker reset for ${provider}`);
      return true;
    }
    return false;
  }

  // Reset all circuit breakers
  resetAllCircuits() {
    let resetCount = 0;
    this.circuits.forEach((circuit, provider) => {
      if (this.resetCircuit(provider)) {
        resetCount++;
      }
    });
    
    console.log(`🔄 Reset ${resetCount} circuit breakers`);
    return resetCount;
  }
}

// Export singleton instance
module.exports = new CircuitBreakerService();