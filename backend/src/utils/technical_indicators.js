// Temporarily using simple implementations without external dependencies
// This allows Market Overview v2 to run without trading-signals/lodash dependencies

/**
 * Calculate Relative Strength Index (RSI) - Simple implementation
 * @param {number[]} prices - Array of prices
 * @param {number} period - RSI period (default: 14)
 * @returns {number[]} Array of RSI values
 */
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return [];
  }

  const rsiValues = [];
  
  for (let i = period; i < prices.length; i++) {
    const gains = [];
    const losses = [];
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = prices[j] - prices[j - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }
  }

  return rsiValues;
}

/**
 * Calculate Simple Moving Average (SMA) - Simple implementation
 * @param {number[]} prices - Array of prices
 * @param {number} period - Moving average period
 * @returns {number[]} Array of SMA values
 */
function calculateMovingAverage(prices, period) {
  if (prices.length < period) {
    return [];
  }

  const smaValues = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    smaValues.push(sum / period);
  }

  return smaValues;
}

/**
 * Calculate Exponential Moving Average (EMA) - Stub implementation
 * @param {number[]} prices - Array of prices
 * @param {number} period - EMA period
 * @returns {number[]} Array of EMA values
 */
function calculateEMA(prices, period) {
  // Simplified EMA implementation
  return calculateMovingAverage(prices, period); // Fallback to SMA
}

/**
 * Calculate Bollinger Bands - Stub implementation
 * @param {number[]} prices - Array of prices
 * @param {number} period - Period for moving average
 * @param {number} stdDev - Number of standard deviations
 * @returns {Object} Object with upper, middle, and lower bands
 */
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  // Simplified implementation
  const sma = calculateMovingAverage(prices, period);
  return { 
    upper: sma.map(val => val * 1.02), 
    middle: sma, 
    lower: sma.map(val => val * 0.98) 
  };
}

/**
 * Calculate MACD - Stub implementation
 * @param {number[]} prices - Array of prices
 * @param {number} fastPeriod - Fast EMA period (default: 12)
 * @param {number} slowPeriod - Slow EMA period (default: 26)
 * @param {number} signalPeriod - Signal line EMA period (default: 9)
 * @returns {Object} Object with MACD line, signal line, and histogram
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  // Simplified implementation
  const fastMA = calculateMovingAverage(prices, fastPeriod);
  const slowMA = calculateMovingAverage(prices, slowPeriod);
  const macdLine = fastMA.map((val, i) => val - (slowMA[i] || val));
  
  return { 
    macd: macdLine, 
    signal: macdLine.map(val => val * 0.9), 
    histogram: macdLine.map(val => val * 0.1) 
  };
}

module.exports = {
  calculateRSI,
  calculateMovingAverage,
  calculateEMA,
  calculateBollingerBands,
  calculateMACD
};