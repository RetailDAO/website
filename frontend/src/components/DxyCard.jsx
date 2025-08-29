import { useDxyAnalysis } from '../hooks/useApi';
import { useTheme } from '../context/ThemeContext';
import Tooltip, { CryptoTooltips } from './Tooltip';

function DxyCard() {
  const { colors } = useTheme();
  const { data, loading, error } = useDxyAnalysis('1D');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">DXY Index</h2>
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">DXY Index</h2>
        <div className="text-center text-red-600">
          <p>Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const current = data?.data?.current || {};
  const analysis = data?.data?.analysis || {};
  const price = current.price;
  const change = current.change24h;

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return price.toFixed(4);
  };

  const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';
  const changeSymbol = change >= 0 ? '+' : '';


  const getTrendIcon = (trend) => {
    return trend === 'bullish' ? '📈' : trend === 'bearish' ? '📉' : '➡️';
  };

  const getCryptoImpact = (price) => {
    if (!price) return { text: 'Analysis pending', color: 'text-gray-600' };
    
    if (price >= 105) {
      return { 
        text: 'Strong dollar → Risk assets (crypto) typically decline', 
        color: 'text-red-600',
        level: 'Strong Dollar'
      };
    } else if (price >= 102) {
      return { 
        text: 'Neutral dollar strength → Mixed crypto impact', 
        color: 'text-yellow-600',
        level: 'Moderate Dollar'
      };
    } else {
      return { 
        text: 'Weak dollar → Risk assets (crypto) typically benefit', 
        color: 'text-green-600',
        level: 'Weak Dollar'
      };
    }
  };

  const getThresholdContext = (price) => {
    if (!price) return 'Monitoring key levels...';
    
    if (price > 105) return 'Above strong resistance (105+)';
    if (price > 102) return 'In consolidation range (102-105)';
    if (price > 100) return 'Approaching support (100-102)';
    return 'Below major support (<100)';
  };

  const cryptoImpact = getCryptoImpact(price, change);

  return (
    <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6 animate-fade-in theme-transition hover-lift`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">DXY (Dollar Index)</h2>
          <Tooltip
            title={CryptoTooltips.DXY.title}
            content={CryptoTooltips.DXY.content}
            educational={true}
            position="right"
          >
            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold cursor-help">
              ?
            </div>
          </Tooltip>
        </div>
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
      </div>
      
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-blue-500 mb-2">
          {formatPrice(price)}
        </div>
        {change !== null && change !== undefined && (
          <div className={`text-sm font-medium ${changeColor}`}>
            {changeSymbol}{change.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Enhanced context section */}
      <div className="space-y-3 mb-4">
        <div className={`p-3 rounded-lg ${cryptoImpact.color.includes('red') ? 'bg-red-50' : cryptoImpact.color.includes('green') ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{cryptoImpact.level}</span>
            <span className="text-xs text-gray-600">{getThresholdContext(price)}</span>
          </div>
          <p className={`text-sm ${cryptoImpact.color}`}>
            {cryptoImpact.text}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Current Level:</span>
          <span className="font-semibold">
            {price >= 105 ? '🔴 Strong' : price >= 102 ? '🟡 Moderate' : price >= 100 ? '🟢 Neutral' : '🟢 Weak'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trend:</span>
          <span className="font-semibold">
            {getTrendIcon(analysis.trend)} {analysis.trend || 'Neutral'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Key Levels:</span>
          <span className="text-xs">
            <span className="text-green-600">Support: 100</span> | <span className="text-red-600">Resistance: 105</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default DxyCard;