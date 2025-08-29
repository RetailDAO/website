import { useState } from 'react';
import { useMARibbon } from '../hooks/useApi';
import Tooltip, { CryptoTooltips } from './Tooltip';

function BitcoinMARibbonChart() {
  const [timeframe, setTimeframe] = useState('30D');
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, loading, error } = useMARibbon('BTC', timeframe, 30000); // Refresh every 30 seconds

  const timeframes = [
    { value: '1D', label: '1D' },
    { value: '7D', label: '7D' },
    { value: '30D', label: '30D' },
    { value: '90D', label: '90D' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Bitcoin MA Ribbon</h2>
          <div className="animate-pulse w-20 h-6 bg-gray-200 rounded"></div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2 w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Bitcoin MA Ribbon</h2>
        <div className="text-center text-red-600 h-64 flex items-center justify-center">
          <div>
            <p>Error loading MA data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const maData = data?.data;
  const currentPrice = maData?.currentPrice;
  const movingAverages = maData?.movingAverages;
  const signals = maData?.signals;
  const trendAnalysis = maData?.trendAnalysis;

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  };

  const getMATrendColor = (alignment) => {
    switch (alignment) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMAPillColor = (period, isAbove) => {
    const colors = {
      20: isAbove ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      50: isAbove ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800',
      100: isAbove ? 'bg-purple-100 text-purple-800' : 'bg-pink-100 text-pink-800',
      200: isAbove ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
    };
    return colors[period] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md transition-all duration-300 ${isExpanded ? 'p-8' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Bitcoin MA Ribbon</h2>
          <Tooltip
            title={CryptoTooltips.MovingAverages.title}
            content={CryptoTooltips.MovingAverages.content}
            educational={true}
            position="right"
          >
            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold cursor-help">
              ?
            </div>
          </Tooltip>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeframes.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeframe(value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timeframe === value
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Expand/collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Current price and trend */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-bitcoin-orange mb-2">
          {formatPrice(currentPrice)}
        </div>
        {trendAnalysis && (
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${getMATrendColor(trendAnalysis.alignment)}`}>
              {trendAnalysis.description} ({trendAnalysis.score}/{trendAnalysis.maxScore})
            </span>
            <div className="text-xs text-gray-500">
              {maData?.dataPoints} data points
            </div>
          </div>
        )}
      </div>

      {/* MA Pills */}
      {movingAverages && signals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[20, 50, 100, 200].map(period => {
            const maValue = movingAverages[`ma${period}`];
            const isAbove = signals[`above_ma${period}`];
            return (
              <div
                key={period}
                className={`px-3 py-2 rounded-full text-xs font-medium text-center ${getMAPillColor(period, isAbove)}`}
              >
                <div>MA{period}</div>
                <div>{formatPrice(maValue)}</div>
                <div className="text-xs opacity-75">
                  {isAbove ? '↑ Above' : '↓ Below'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-6 space-y-4">
          {/* MA Ribbon visualization (simplified since we don't have historical data) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Moving Average Levels</h4>
            <div className="space-y-2">
              {movingAverages && Object.entries(movingAverages).map(([key, value]) => {
                const period = key.replace('ma', '');
                const isAbove = signals[`above_${key}`];
                const distance = currentPrice ? ((currentPrice - value) / currentPrice * 100).toFixed(1) : '0';
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${period === '20' ? 'bg-green-500' : period === '50' ? 'bg-blue-500' : period === '100' ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                      <span className="text-sm">MA{period}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatPrice(value)}</div>
                      <div className={`text-xs ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                        {isAbove ? '+' : ''}{distance}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend signals */}
          {trendAnalysis && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Trend Analysis</h4>
              <div className="text-sm text-gray-700">
                <p className="mb-1">
                  <strong>Overall Trend:</strong> <span className={getMATrendColor(trendAnalysis.alignment)}>{trendAnalysis.description}</span>
                </p>
                <p className="text-xs">
                  Score is based on MA alignment: shorter MAs above longer MAs indicate bullish trend
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer with update time */}
      {maData?.lastUpdated && (
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          Updated: {new Date(maData.lastUpdated).toLocaleTimeString()}
          {maData.isMockData && <span className="ml-2 text-orange-500">(Demo Data)</span>}
        </div>
      )}
    </div>
  );
}

export default BitcoinMARibbonChart;