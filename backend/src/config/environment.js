module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 8000,
  
  // API Keys
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  BINANCE_API_KEY: process.env.BINANCE_API_KEY,
  BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  COINGLASS_API_KEY: process.env.COINGLASS_API_KEY,
  FRED_API_KEY: process.env.FRED_API_KEY,
  
  // Redis - Railway will provide this automatically in production
  REDIS_URL: process.env.REDIS_URL,
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
  
  // External APIs
  COINGECKO_BASE_URL: 'https://api.coingecko.com/api/v3',
  ALPHA_VANTAGE_BASE_URL: 'https://www.alphavantage.co/query',
  BINANCE_BASE_URL: 'https://api.binance.com',
  POLYGON_BASE_URL: 'https://api.polygon.io/v2',
  COINGLASS_BASE_URL: 'https://open-api.coinglass.com/public/v2',
  FRED_BASE_URL: 'https://api.stlouisfed.org/fred',
};
