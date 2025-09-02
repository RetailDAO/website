const _ = require('lodash');

/**
 * Calculate Relative Strength Index (RSI)
 * @param {number[]} prices - Array of prices
 * @param {number} period - RSI period (default: 14)
 * @returns {number[]} Array of RSI values
 */
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return [];
  }

  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const rsiValues = [];
  
  // Calculate first RSI value
  const avgGain = _.mean(gains.slice(0, period));
  const avgLoss = _.mean(losses.slice(0, period));
  
  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  rsiValues.push(rsi);

  // Calculate subsequent RSI values using smoothed averages
  let currentAvgGain = avgGain;
  let currentAvgLoss = avgLoss;
  
  for (let i = period; i < gains.length; i++) {
    currentAvgGain = (currentAvgGain * (period - 1) + gains[i]) / period;
    currentAvgLoss = (currentAvgLoss * (period - 1) + losses[i]) / period;
    
    rs = currentAvgLoss === 0 ? 100 : currentAvgGain / currentAvgLoss;
    rsi = 100 - (100 / (1 + rs));
    rsiValues.push(rsi);
  }

  return rsiValues;
}

/**
 * Calculate Simple Moving Average (SMA)
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
    const average = _.mean(slice);
    smaValues.push(average);
  }

  return smaValues;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {number[]} prices - Array of prices
 * @param {number} period - EMA period
 * @returns {number[]} Array of EMA values
 */
function calculateEMA(prices, period) {
  if (prices.length < period) {
    return [];
  }

  const emaValues = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is SMA
  let ema = _.mean(prices.slice(0, period));
  emaValues.push(ema);

  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    emaValues.push(ema);
  }

  return emaValues;
}

/**
 * Calculate Bollinger Bands
 * @param {number[]} prices - Array of prices
 * @param {number} period - Period for moving average
 * @param {number} stdDev - Number of standard deviations
 * @returns {Object} Object with upper, middle, and lower bands
 */
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const sma = calculateMovingAverage(prices, period);
  const bands = { upper: [], middle: [], lower: [] };

  for (let i = 0; i < sma.length; i++) {
    const slice = prices.slice(i, i + period);
    const mean = sma[i];
    const variance = _.mean(slice.map(price => Math.pow(price - mean, 2)));
    const standardDeviation = Math.sqrt(variance);

    bands.middle.push(mean);
    bands.upper.push(mean + (standardDeviation * stdDev));
    bands.lower.push(mean - (standardDeviation * stdDev));
  }

  return bands;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {number[]} prices - Array of prices
 * @param {number} fastPeriod - Fast EMA period (default: 12)
 * @param {number} slowPeriod - Slow EMA period (default: 26)
 * @param {number} signalPeriod - Signal line EMA period (default: 9)
 * @returns {Object} Object with MACD line, signal line, and histogram
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macdLine = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
  }
  
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = [];
  const signalStartIndex = signalPeriod - 1;
  
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalStartIndex] - signalLine[i]);
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

module.exports = {
  calculateRSI,
  calculateMovingAverage,
  calculateEMA,
  calculateBollingerBands,
  calculateMACD
};