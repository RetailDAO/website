const constants = {
  TIMEFRAMES: {
    '1D': { days: 1, interval: 'hourly' },
    '7D': { days: 7, interval: 'daily' },
    '30D': { days: 30, interval: 'daily' },
    '90D': { days: 90, interval: 'daily' },
    '1Y': { days: 365, interval: 'weekly' }
  },

  CACHE_KEYS: {
    BTC_DATA: 'btc_data',
    DXY_DATA: 'dxy_data',
    ETF_FLOWS: 'etf_flows',
    FUNDING_RATES: 'funding_rates',
    RSI_DATA: 'rsi_data'
  },

  API_LIMITS: {
    COINGECKO_RPM: 50, // Requests per minute
    ALPHA_VANTAGE_RPD: 500, // Requests per day
    BINANCE_RPS: 20 // Requests per second
  },

  TECHNICAL_INDICATORS: {
    RSI_OVERSOLD: 30,
    RSI_OVERBOUGHT: 70,
    RSI_NEUTRAL: 50,
    BOLLINGER_PERIOD: 20,
    BOLLINGER_STD_DEV: 2,
    MACD_FAST: 12,
    MACD_SLOW: 26,
    MACD_SIGNAL: 9
  }
};

module.exports = {
  constants
};