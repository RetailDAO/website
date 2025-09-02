/**
 * Technical Analysis Calculation Utilities
 * Client-side calculations for RSI, Moving Averages, and other indicators
 */

/**
 * Calculate RSI (Relative Strength Index)
 * @param {Array} prices - Array of price objects with {timestamp, price}
 * @param {number} period - RSI period (default 14)
 * @returns {Array} Array of RSI values with {timestamp, value, period}
 */
export function calculateRSI(prices, period = 14) {
  if (!prices || !Array.isArray(prices) || prices.length < period + 1) {
    return [];
  }

  const results = [];
  let gains = [];
  let losses = [];

  // Calculate initial gains and losses
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i].price - prices[i - 1].price;
    
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }

    // Start calculating RSI after we have enough data
    if (i >= period) {
      let avgGain, avgLoss;

      if (results.length === 0) {
        // First RSI calculation - simple average
        avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
        avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
      } else {
        // Subsequent RSI calculations - Wilder's smoothing method
        const prevResult = results[results.length - 1];
        avgGain = ((prevResult.avgGain * (period - 1)) + gains[gains.length - 1]) / period;
        avgLoss = ((prevResult.avgLoss * (period - 1)) + losses[losses.length - 1]) / period;
      }

      let rsi;
      if (avgLoss === 0) {
        rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }

      results.push({
        timestamp: prices[i].timestamp,
        value: parseFloat(rsi.toFixed(2)),
        period: period,
        avgGain: avgGain,
        avgLoss: avgLoss
      });
    }
  }

  return results;
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array} prices - Array of price objects with {timestamp, price}
 * @param {number} period - MA period (default 20)
 * @returns {Array} Array of MA values with {timestamp, value, period}
 */
export function calculateSMA(prices, period = 20) {
  if (!prices || !Array.isArray(prices) || prices.length < period) {
    return [];
  }

  const results = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sum = slice.reduce((total, item) => total + item.price, 0);
    const average = sum / period;

    results.push({
      timestamp: prices[i].timestamp,
      value: parseFloat(average.toFixed(2)),
      period: period
    });
  }

  return results;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {Array} prices - Array of price objects with {timestamp, price}
 * @param {number} period - EMA period (default 20)
 * @returns {Array} Array of EMA values with {timestamp, value, period}
 */
export function calculateEMA(prices, period = 20) {
  if (!prices || !Array.isArray(prices) || prices.length < period) {
    return [];
  }

  const results = [];
  const multiplier = 2 / (period + 1);
  
  // Calculate initial SMA as starting point
  const initialSlice = prices.slice(0, period);
  const initialSum = initialSlice.reduce((total, item) => total + item.price, 0);
  let ema = initialSum / period;

  results.push({
    timestamp: prices[period - 1].timestamp,
    value: parseFloat(ema.toFixed(2)),
    period: period
  });

  // Calculate EMA for remaining data points
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i].price * multiplier) + (ema * (1 - multiplier));
    
    results.push({
      timestamp: prices[i].timestamp,
      value: parseFloat(ema.toFixed(2)),
      period: period
    });
  }

  return results;
}

/**
 * Calculate multiple RSI periods at once
 * @param {Array} prices - Array of price objects
 * @param {Array} periods - Array of periods to calculate [14, 21, 30]
 * @returns {Object} Object with period keys and RSI arrays
 */
export function calculateMultipleRSI(prices, periods = [14, 21, 30]) {
  const results = {};
  
  periods.forEach(period => {
    results[period] = calculateRSI(prices, period);
  });

  return results;
}

/**
 * Calculate multiple Moving Average periods at once
 * @param {Array} prices - Array of price objects
 * @param {Array} periods - Array of periods to calculate [20, 50, 100, 200]
 * @param {string} type - 'sma' or 'ema'
 * @returns {Object} Object with period keys and MA arrays
 */
export function calculateMultipleMA(prices, periods = [20, 50, 100, 200], type = 'sma') {
  const results = {};
  const calculateFn = type === 'ema' ? calculateEMA : calculateSMA;
  
  periods.forEach(period => {
    results[period] = calculateFn(prices, period);
  });

  return results;
}

/**
 * Get current RSI status based on value
 * @param {number} rsiValue - RSI value
 * @returns {string} 'Overbought', 'Oversold', or 'Normal'
 */
export function getRSIStatus(rsiValue) {
  if (rsiValue >= 70) return 'Overbought';
  if (rsiValue <= 30) return 'Oversold';
  return 'Normal';
}

/**
 * Get RSI signal based on value
 * @param {number} rsiValue - RSI value
 * @returns {string} 'BUY', 'SELL', or 'HOLD'
 */
export function getRSISignal(rsiValue) {
  if (rsiValue >= 70) return 'SELL';
  if (rsiValue <= 30) return 'BUY';
  return 'HOLD';
}

/**
 * Calculate current RSI values from historical data
 * @param {Object} rsiData - RSI data object with periods as keys
 * @returns {Object} Current RSI values for each period
 */
export function getCurrentRSIValues(rsiData) {
  const current = {};
  
  Object.entries(rsiData).forEach(([period, data]) => {
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1];
      current[period] = {
        current: latest.value,
        status: getRSIStatus(latest.value),
        signal: getRSISignal(latest.value),
        timestamp: latest.timestamp
      };
    }
  });

  return current;
}

/**
 * Calculate current MA values from historical data
 * @param {Object} maData - MA data object with periods as keys
 * @param {number} currentPrice - Current price for comparison
 * @returns {Object} Current MA values for each period
 */
export function getCurrentMAValues(maData, currentPrice = null) {
  const current = {};
  
  Object.entries(maData).forEach(([period, data]) => {
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1];
      const position = currentPrice ? 
        (currentPrice > latest.value ? 'above' : 
         currentPrice < latest.value ? 'below' : 'at') : 'unknown';
      
      current[period] = {
        current: latest.value,
        position: position,
        deviation: currentPrice ? 
          parseFloat(((currentPrice - latest.value) / latest.value * 100).toFixed(2)) : 0,
        timestamp: latest.timestamp
      };
    }
  });

  return current;
}

/**
 * Update price data with new WebSocket price
 * @param {Array} existingPrices - Existing price array
 * @param {Object} newPrice - New price object {price, timestamp}
 * @param {number} maxLength - Maximum array length (default 500)
 * @returns {Array} Updated price array
 */
export function updatePriceHistory(existingPrices, newPrice, maxLength = 500) {
  if (!Array.isArray(existingPrices)) {
    return [{ timestamp: new Date(newPrice.timestamp || Date.now()), price: newPrice.price }];
  }

  const updated = [...existingPrices];
  const timestamp = new Date(newPrice.timestamp || Date.now());
  
  // Add new price point
  updated.push({ timestamp, price: newPrice.price });
  
  // Keep only recent data to prevent memory bloat
  if (updated.length > maxLength) {
    updated.splice(0, updated.length - maxLength);
  }
  
  return updated;
}

/**
 * Calculate indicators for real-time price updates
 * @param {Array} priceHistory - Historical price data
 * @param {Object} options - Calculation options
 * @returns {Object} Calculated indicators
 */
export function calculateRealtimeIndicators(priceHistory, options = {}) {
  const {
    rsiPeriods = [14, 21, 30],
    maPeriods = [20, 50, 100, 200],
    maType = 'sma'
  } = options;

  if (!Array.isArray(priceHistory) || priceHistory.length < 2) {
    return { rsi: {}, movingAverages: {} };
  }

  // Calculate RSI for all periods
  const rsi = calculateMultipleRSI(priceHistory, rsiPeriods);
  const rsiCurrent = getCurrentRSIValues(rsi);

  // Calculate Moving Averages for all periods
  const movingAverages = calculateMultipleMA(priceHistory, maPeriods, maType);
  const currentPrice = priceHistory[priceHistory.length - 1].price;
  const maCurrent = getCurrentMAValues(movingAverages, currentPrice);

  return {
    rsi: rsiCurrent,
    movingAverages: maCurrent,
    currentPrice: currentPrice,
    timestamp: priceHistory[priceHistory.length - 1].timestamp
  };
}