import { useBitcoinPrice } from '../hooks/useApi';
import { useTheme } from '../context/ThemeContext';

function BitcoinCard() {
  const { colors } = useTheme();
  const { data, loading, error } = useBitcoinPrice(30000); // Refresh every 30 seconds

  if (loading) {
    return (
      <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6 theme-transition`}>
        <h2 className={`text-xl font-semibold mb-4 ${colors.text.primary}`}>Bitcoin</h2>
        <div className="text-center">
          <div className="animate-pulse">
            <div className={`h-8 ${colors.bg.tertiary} rounded mb-2`}></div>
            <div className={`h-4 ${colors.bg.tertiary} rounded`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6 theme-transition`}>
        <h2 className={`text-xl font-semibold mb-4 ${colors.text.primary}`}>Bitcoin</h2>
        <div className="text-center text-red-600">
          <p>Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const price = data?.data?.price || data?.price;
  const change = data?.data?.change24h || data?.change24h;
  const volume = data?.data?.volume24h || data?.volume24h;
  const marketCap = data?.data?.marketCap || data?.marketCap;

  const formatNumber = (num, prefix = '') => {
    if (!num) return 'N/A';
    if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(2)}K`;
    return `${prefix}${num.toLocaleString()}`;
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  };

  const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';
  const changeSymbol = change >= 0 ? '+' : '';

  return (
    <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6 animate-fade-in theme-transition hover-lift`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-semibold ${colors.text.primary}`}>Bitcoin</h2>
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      </div>
      
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-orange-500 mb-2">
          {formatPrice(price)}
        </div>
        <div className={`text-sm font-medium ${changeColor}`}>
          {changeSymbol}{change?.toFixed(2)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className={`${colors.text.muted}`}>Volume 24h</p>
          <p className={`font-semibold ${colors.text.primary}`}>{formatNumber(volume, '$')}</p>
        </div>
        <div>
          <p className={`${colors.text.muted}`}>Market Cap</p>
          <p className={`font-semibold ${colors.text.primary}`}>{formatNumber(marketCap, '$')}</p>
        </div>
      </div>
    </div>
  );
}

export default BitcoinCard;