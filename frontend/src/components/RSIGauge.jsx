
import { useState, useEffect, useMemo } from 'react';
import Tooltip, { CryptoTooltips } from './Tooltip';
import { useTheme } from '../context/ThemeContext';
import { useSymbolIndicators } from '../hooks/useIndicatorData';

const RSIGauge = ({ 
  rsiValue, 
  period = 14, 
  size = 'lg',
  showLabel = true 
}) => {
  const { colors } = useTheme();
  // Ensure RSI is within bounds
  const normalizedRSI = Math.max(0, Math.min(100, rsiValue || 50));
  
  // Determine status and colors
  const getStatusInfo = (rsi) => {
    if (rsi >= 70) {
      return {
        status: 'Overbought',
        signal: 'SELL',
        color: 'bg-red-500',
        textColor: 'text-red-400',
        bgColor: 'bg-red-900',
        borderColor: 'border-red-500'
      };
    } else if (rsi <= 30) {
      return {
        status: 'Oversold',
        signal: 'BUY',
        color: 'bg-green-500',
        textColor: 'text-green-400',
        bgColor: 'bg-green-900',
        borderColor: 'border-green-500'
      };
    } else {
      return {
        status: 'Normal',
        signal: 'HOLD',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-400',
        bgColor: 'bg-yellow-900',
        borderColor: 'border-yellow-500'
      };
    }
  };

  const statusInfo = getStatusInfo(normalizedRSI);
  
  // Size configurations for vertical pills - enhanced thickness
  const sizeConfig = {
    sm: {
      container: 'w-12 h-32',
      track: 'w-6',
      value: 'text-sm',
      label: 'text-sm'
    },
    md: {
      container: 'w-16 h-40',
      track: 'w-8',
      value: 'text-base',
      label: 'text-base'
    },
    lg: {
      container: 'w-20 h-48',
      track: 'w-10',
      value: 'text-lg',
      label: 'text-lg'
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* RSI Value Display - Enhanced */}
      <div className="text-center">
        <div className={`text-3xl font-bold ${colors.text.primary} mb-1`}>
          {normalizedRSI.toFixed(1)}
        </div>
        {showLabel && (
          <div className={`text-sm ${colors.text.muted} mb-1`}>
            RSI ({period}d)
          </div>
        )}
        {/* Trader-specific tags */}
        {showLabel && (
          <div className={`text-sm px-2 py-1 rounded-full ${colors.bg.tertiary} ${colors.text.tertiary}`}>
            {period === 14 && "Day Traders"}
            {period === 21 && "Swing Traders"}
            {period === 30 && "Long Term Investors"}
          </div>
        )}
      </div>

      {/* Vertical Pill-shaped Gauge */}
      <div className={`relative ${config.container} mx-auto flex justify-center`}>
        {/* Background Track - Properly Centered */}
        <div className={`relative ${config.track} h-full ${colors.bg.tertiary} rounded-full shadow-inner`}>
          {/* Critical zones indicators - vertical */}
          <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-green-800 rounded-b-full opacity-30"></div>
          <div className="absolute top-0 left-0 right-0 h-[30%] bg-red-800 rounded-t-full opacity-30"></div>
          
          {/* Zone markers - vertical */}
          <div className={`absolute bottom-[30%] left-0 right-0 h-[1px] ${colors.border.primary} opacity-50`}></div>
          <div className={`absolute top-[30%] left-0 right-0 h-[1px] ${colors.border.primary} opacity-50`}></div>
          
          {/* RSI Fill - from bottom with integrated gradient colors - Centered */}
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ 
              height: `${normalizedRSI}%`,
              background: `linear-gradient(to top, 
                ${normalizedRSI <= 30 ? '#10B981' : normalizedRSI >= 70 ? '#EF4444' : '#F59E0B'} 0%, 
                ${normalizedRSI <= 30 ? '#059669' : normalizedRSI >= 70 ? '#DC2626' : '#D97706'} 100%)`
            }}
          >
            {/* Enhanced glow effect */}
            <div 
              className="absolute inset-0 rounded-full blur-md opacity-40"
              style={{ 
                background: `linear-gradient(to top, 
                  ${normalizedRSI <= 30 ? '#10B981' : normalizedRSI >= 70 ? '#EF4444' : '#F59E0B'} 0%, 
                  ${normalizedRSI <= 30 ? '#059669' : normalizedRSI >= 70 ? '#DC2626' : '#D97706'} 100%)`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} border`}>
        {statusInfo.status}
      </div>

      {/* Signal Badge */}
      <div className={`px-2 py-1 rounded text-xs font-bold ${
        statusInfo.signal === 'BUY' ? 'bg-green-600 text-white' :
        statusInfo.signal === 'SELL' ? 'bg-red-600 text-white' :
`${colors.bg.tertiary} ${colors.text.tertiary}`
      }`}>
        {statusInfo.signal}
      </div>
    </div>
  );
};

// Real-time RSI Component using Dashboard data
export const LiveRSIDisplay = ({ 
  symbol = 'BTC', 
  theme = 'orange', 
  showDataSource = true,
  rsiData = null, // RSI data from Dashboard
  loading = false,
  wsConnected = false 
}) => {
  const { colors: themeColors } = useTheme();
  
  // Use passed RSI data instead of hook
  const rsi = useMemo(() => rsiData || {}, [rsiData]);

  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  useEffect(() => {
    if (rsi && Object.keys(rsi).length > 0) {
      setLastUpdateTime(new Date());
    }
  }, [rsi]);

  const colorThemes = {
    orange: {
      primary: 'text-orange-500',
      accent: 'text-orange-400',
      bg: 'bg-orange-900',
      glow: 'shadow-orange-500/30'
    },
    blue: {
      primary: 'text-blue-500',
      accent: 'text-blue-400', 
      bg: 'bg-blue-900',
      glow: 'shadow-blue-500/30'
    },
    green: {
      primary: 'text-green-500',
      accent: 'text-green-400',
      bg: 'bg-green-900',
      glow: 'shadow-green-500/30'
    }
  };

  const colors = colorThemes[theme] || colorThemes.orange;
  const dataInfo = {
    available: rsiData && Object.keys(rsiData).length > 0,
    source: 'dashboard_api',
    fresh: true
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={`h-8 ${themeColors.bg.secondary} rounded mb-2`}></div>
        <div className="flex justify-center items-end space-x-12 py-4">
          {[14, 21, 30].map(period => (
            <div key={period} className="text-center">
              <div className={`w-20 h-48 ${themeColors.bg.tertiary} rounded-full mb-2`}></div>
              <div className={`h-4 w-16 ${themeColors.bg.secondary} rounded`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <h3 className={`text-lg font-semibold ${colors.primary}`}>
          {symbol} RSI Indicators
        </h3>
        
        {/* Data Source Indicator */}
        {showDataSource && dataInfo.available && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${themeColors.bg.tertiary}`}>
            <div className={`w-2 h-2 rounded-full ${
              wsConnected && dataInfo.fresh ? 'bg-green-400' : 
              dataInfo.source === 'api_fallback' ? 'bg-yellow-400' : 
              'bg-gray-400'
            }`}></div>
            <span className={themeColors.text.muted}>
              {wsConnected && dataInfo.fresh ? 'Live' : 
               dataInfo.source === 'api_fallback' ? 'API' : 
               'Cached'}
            </span>
          </div>
        )}

        <Tooltip
          title={CryptoTooltips.RSI.title}
          content={CryptoTooltips.RSI.content}
          educational={true}
          position="top"
          maxWidth="480px"
        >
          <div className={`w-5 h-5 ${themeColors.bg.secondary} ${themeColors.text.tertiary} rounded-full flex items-center justify-center text-xs font-bold cursor-help ${themeColors.bg.hover}`}>
            ?
          </div>
        </Tooltip>
      </div>
      
      <div className="flex justify-center items-end space-x-12 py-4">
        {[14, 21, 30].map(period => {
          // Extract current RSI value from array (last item) or use .current property if available
          let rsiValue = 50;
          let status = 'Unknown';
          
          if (rsi[period]) {
            if (Array.isArray(rsi[period]) && rsi[period].length > 0) {
              // Array format from mock data - get last item
              rsiValue = rsi[period][rsi[period].length - 1]?.value || 50;
            } else if (rsi[period].current !== undefined) {
              // Object format with current property
              rsiValue = rsi[period].current;
              status = rsi[period].status || 'Unknown';
            }
          }

          // Determine status based on RSI value
          if (status === 'Unknown') {
            if (rsiValue >= 70) {
              status = 'Overbought';
            } else if (rsiValue <= 30) {
              status = 'Oversold';
            } else {
              status = 'Normal';
            }
          }
          
          return (
            <div key={period} className="text-center">
              <RSIGauge 
                rsiValue={rsiValue} 
                period={period}
                symbol={symbol}
                size="md"
                showLabel={true}
              />
              
              {/* Enhanced status info */}
              <div className={`mt-2 text-xs ${themeColors.text.muted}`}>
                Status: <span className={`font-semibold ${
                  status === 'Overbought' ? 'text-red-400' :
                  status === 'Oversold' ? 'text-green-400' :
                  'text-yellow-400'
                }`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time update info */}
      {lastUpdateTime && (
        <div className={`mt-4 text-center text-xs ${themeColors.text.muted} flex items-center justify-center gap-2`}>
          <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
          <span>
            Last update: {lastUpdateTime.toLocaleTimeString()}
            {/* Price info removed - data comes from Dashboard */}
          </span>
        </div>
      )}

      {/* Educational info */}
      <div className={`mt-4 text-center text-xs ${themeColors.text.muted}`}>
        <div>
          <span className="text-green-400">Green Zone (0-30)</span> = Oversold (Buy Signal)
        </div>
        <div>
          <span className="text-yellow-400">Yellow Zone (30-70)</span> = Normal (Hold)
        </div>
        <div>
          <span className="text-red-400">Red Zone (70-100)</span> = Overbought (Sell Signal)
        </div>
      </div>
    </div>
  );
};

// Multi-RSI Display Component (Legacy - for backward compatibility)
export const MultiRSIDisplay = ({ rsiData, symbol = 'BTC', theme = 'orange' }) => {
  const { colors: themeColors } = useTheme();
  if (!rsiData) return null;

  const colorThemes = {
    orange: {
      primary: 'text-orange-500',
      accent: 'text-orange-400',
      bg: 'bg-orange-900',
      glow: 'shadow-orange-500/30'
    },
    blue: {
      primary: 'text-blue-500',
      accent: 'text-blue-400', 
      bg: 'bg-blue-900',
      glow: 'shadow-blue-500/30'
    }
  };

  const colors = colorThemes[theme] || colorThemes.orange;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <h3 className={`text-lg font-semibold ${colors.primary}`}>
          {symbol} RSI Indicators
        </h3>
        <Tooltip
          title={CryptoTooltips.RSI.title}
          content={CryptoTooltips.RSI.content}
          educational={true}
          position="top"
          maxWidth="480px"
        >
          <div className={`w-5 h-5 ${themeColors.bg.secondary} ${themeColors.text.tertiary} rounded-full flex items-center justify-center text-xs font-bold cursor-help ${themeColors.bg.hover}`}>
            ?
          </div>
        </Tooltip>
      </div>
      
      <div className="flex justify-center items-end space-x-12 py-4">
        {[14, 21, 30].map(period => {
          const periodData = rsiData[period];
          const currentRSI = periodData && periodData.length > 0 
            ? periodData[periodData.length - 1].value 
            : 50;

          return (
            <div key={period} className="text-center">
              <RSIGauge 
                rsiValue={currentRSI} 
                period={period}
                symbol={symbol}
                size="md"
                showLabel={true}
              />
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className={`mt-4 text-center text-xs ${themeColors.text.muted}`}>
        <div>
          <span className="text-green-400">Green Zone (0-30)</span> = Oversold (Buy Signal)
        </div>
        <div>
          <span className="text-yellow-400">Yellow Zone (30-70)</span> = Normal (Hold)
        </div>
        <div>
          <span className="text-red-400">Red Zone (70-100)</span> = Overbought (Sell Signal)
        </div>
      </div>
    </div>
  );
};

export default RSIGauge;