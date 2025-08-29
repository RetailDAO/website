const validators = {
  isValidTimeframe: (timeframe) => {
    const validTimeframes = ['1D', '7D', '30D', '90D', '1Y'];
    return validTimeframes.includes(timeframe);
  },

  isValidSymbol: (symbol) => {
    return typeof symbol === 'string' && 
           symbol.length >= 2 && 
           symbol.length <= 10 && 
           /^[A-Za-z0-9]+$/.test(symbol);
  },

  isValidExchange: (exchange) => {
    const validExchanges = ['binance', 'bybit', 'okx', 'coinbase', 'all'];
    return validExchanges.includes(exchange.toLowerCase());
  },

  sanitizeNumber: (value, defaultValue = 0) => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  },

  sanitizeString: (value, maxLength = 100) => {
    if (typeof value !== 'string') return '';
    return value.trim().substring(0, maxLength);
  }
};

module.exports = { validators };