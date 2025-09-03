const _ = require('lodash');
const { RSI, SMA, EMA, BollingerBands, MACD } = require('trading-signals');

/**
 * Calculate Relative Strength Index (RSI) using trading-signals library
 * @param {number[]} prices - Array of prices
 * @param {number} period - RSI period (default: 14)
 * @returns {number[]} Array of RSI values
 */
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return [];
  }

  const rsi = new RSI(period);
  const rsiValues = [];
  
  for (const price of prices) {
    rsi.update(price);
    if (rsi.isStable) {
      rsiValues.push(rsi.getResult().valueOf());
    }
  }

  return rsiValues;
}

/**
 * Calculate Simple Moving Average (SMA) using trading-signals library
 * @param {number[]} prices - Array of prices
 * @param {number} period - Moving average period
 * @returns {number[]} Array of SMA values
 */
function calculateMovingAverage(prices, period) {
  if (prices.length < period) {
    return [];
  }

  const sma = new SMA(period);
  const smaValues = [];
  
  for (const price of prices) {
    sma.update(price);
    if (sma.isStable) {
      smaValues.push(sma.getResult().valueOf());
    }
  }

  return smaValues;
}

/**
 * Calculate Exponential Moving Average (EMA) using trading-signals library
 * @param {number[]} prices - Array of prices
 * @param {number} period - EMA period
 * @returns {number[]} Array of EMA values
 */
function calculateEMA(prices, period) {
  if (prices.length < period) {
    return [];
  }

  const ema = new EMA(period);
  const emaValues = [];
  
  for (const price of prices) {
    ema.update(price);
    if (ema.isStable) {
      emaValues.push(ema.getResult().valueOf());
    }
  }

  return emaValues;
}

/**
 * Calculate Bollinger Bands using trading-signals library
 * @param {number[]} prices - Array of prices
 * @param {number} period - Period for moving average
 * @param {number} stdDev - Number of standard deviations
 * @returns {Object} Object with upper, middle, and lower bands
 */
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const bb = new BollingerBands(period, stdDev);
  const bands = { upper: [], middle: [], lower: [] };

  for (const price of prices) {
    bb.update(price);
    if (bb.isStable) {
      const result = bb.getResult();
      bands.upper.push(result.upper.valueOf());
      bands.middle.push(result.middle.valueOf());
      bands.lower.push(result.lower.valueOf());
    }
  }

  return bands;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence) using trading-signals library
 * @param {number[]} prices - Array of prices
 * @param {number} fastPeriod - Fast EMA period (default: 12)
 * @param {number} slowPeriod - Slow EMA period (default: 26)
 * @param {number} signalPeriod - Signal line EMA period (default: 9)
 * @returns {Object} Object with MACD line, signal line, and histogram
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const macd = new MACD({ fast: fastPeriod, slow: slowPeriod, signal: signalPeriod });
  const result = { macd: [], signal: [], histogram: [] };

  for (const price of prices) {
    macd.update(price);
    if (macd.isStable) {
      const macdResult = macd.getResult();
      result.macd.push(macdResult.macd.valueOf());
      result.signal.push(macdResult.signal.valueOf());
      result.histogram.push(macdResult.histogram.valueOf());
    }
  }
  
  return result;
}

module.exports = {
  calculateRSI,
  calculateMovingAverage,
  calculateEMA,
  calculateBollingerBands,
  calculateMACD
};