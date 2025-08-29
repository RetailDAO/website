const moment = require('moment');

/**
 * Format currency values
 */
const formatters = {
  currency: (value, decimals = 2) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  },

  percentage: (value, decimals = 2) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0.00%';
    }
    
    return `${value.toFixed(decimals)}%`;
  },

  number: (value, decimals = 2) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0';
    }
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  },

  compactNumber: (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0';
    }

    const suffixes = ['', 'K', 'M', 'B', 'T'];
    const suffixNum = Math.floor(Math.log10(Math.abs(value)) / 3);
    const shortValue = value / Math.pow(1000, suffixNum);
    
    return `${shortValue.toFixed(1)}${suffixes[suffixNum]}`;
  },

  timestamp: (timestamp, format = 'YYYY-MM-DD HH:mm:ss') => {
    return moment(timestamp).format(format);
  },

  timeAgo: (timestamp) => {
    return moment(timestamp).fromNow();
  },

  formatCryptoData: (rawData) => {
    return {
      symbol: rawData.symbol,
      price: parseFloat(rawData.price),
      change24h: parseFloat(rawData.price_change_percentage_24h || 0),
      volume24h: parseFloat(rawData.total_volume || 0),
      marketCap: parseFloat(rawData.market_cap || 0),
      lastUpdate: rawData.last_updated
    };
  }
};

module.exports = { formatters };