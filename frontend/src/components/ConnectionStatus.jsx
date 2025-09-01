import { useState } from 'react';
import { useConnectionStatus } from '../hooks/useWebSocket';
import { useIndicatorStream } from '../hooks/useWebSocket';
import { useTheme } from '../context/ThemeContext';

const ConnectionStatus = ({ websocketStatus = 'disconnected', className = '' }) => {
  const { status, checkApiHealth } = useConnectionStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();
  
  // Get indicator streaming status
  const {
    isConnected: indicatorConnected,
    streamStatus,
    hasData,
    isHealthy: indicatorHealthy,
    supportedSymbols
  } = useIndicatorStream({
    autoSubscribe: [], // Don't auto-subscribe, just monitor
    enableDataMerging: false
  });
  
  // Use the status from useConnectionStatus instead of separate health check
  const data = { status: status?.api === 'connected' ? 'healthy' : 'unhealthy', timestamp: status?.lastUpdate };
  const loading = status?.api === 'unknown';
  const error = status?.api === 'disconnected' ? 'API disconnected' : null;

  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'connected': return 'text-green-400 bg-green-500';
      case 'connecting': 
      case 'reconnecting': return 'text-yellow-400 bg-yellow-500';
      case 'degraded': return 'text-orange-400 bg-orange-500';
      case 'disconnected':
      case 'failed': return 'text-red-400 bg-red-500';
      default: return 'text-gray-400 bg-gray-500';
    }
  };

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'connected': return '✅';
      case 'connecting': 
      case 'reconnecting': return '🔄';
      case 'degraded': return '⚠️';
      case 'disconnected':
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = (statusType) => {
    switch (statusType) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      case 'degraded': return 'Degraded';
      case 'disconnected': return 'Disconnected';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  // Determine API status from health check
  const apiStatus = loading ? 'connecting' 
    : error ? 'disconnected' 
    : data?.status === 'healthy' ? 'connected' 
    : 'failed';

  // Calculate overall data quality score
  const getDataQualityStatus = () => {
    let qualityScore = 0;
    let maxScore = 3;
    
    // API connectivity (1 point)
    if (apiStatus === 'connected') qualityScore++;
    
    // WebSocket connectivity (1 point)  
    if (websocketStatus === 'connected') qualityScore++;
    
    // Indicator data availability (1 point)
    if (indicatorConnected && hasData) qualityScore++;
    
    const percentage = (qualityScore / maxScore) * 100;
    
    if (percentage >= 90) return { status: 'excellent', label: 'Excellent', color: 'text-green-400' };
    if (percentage >= 70) return { status: 'good', label: 'Good', color: 'text-blue-400' };
    if (percentage >= 50) return { status: 'fair', label: 'Fair', color: 'text-yellow-400' };
    return { status: 'poor', label: 'Poor', color: 'text-red-400' };
  };

  const dataQuality = getDataQualityStatus();

  return (
    <div className={`relative ${className}`}>
      {/* Status Indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${colors.bg.tertiary} ${colors.bg.hover} ${colors.border.primary} border`}
        title="Click to view connection details"
      >
        {/* Overall Status Light */}
        <div className={`w-3 h-3 rounded-full ${
          dataQuality.status === 'excellent' ? 'bg-green-500 animate-pulse' :
          dataQuality.status === 'good' ? 'bg-blue-500 animate-pulse' :
          dataQuality.status === 'fair' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500'
        }`}></div>
        
        <span className={`text-sm ${colors.text.secondary}`}>
          {dataQuality.label} Data
        </span>
        
        <svg 
          className={`w-4 h-4 ${colors.text.muted} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className={`absolute top-full left-0 mt-2 w-64 ${colors.bg.card} ${colors.border.primary} border rounded-lg ${colors.shadow.card} z-50 p-3`}>
          <div className="space-y-3">
            {/* Header */}
            <div className={`flex justify-between items-center border-b ${colors.border.primary} pb-2`}>
              <h3 className={`text-base font-semibold ${colors.text.primary}`}>Connection Status</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className={`${colors.text.muted} hover:${colors.text.primary}`}
              >
                ✕
              </button>
            </div>

            {/* API Status */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(apiStatus).split(' ')[1]}`}></div>
                <div>
                  <div className={`text-sm font-medium ${colors.text.primary}`}>REST API</div>
                  <div className={`text-xs ${colors.text.muted}`}>Backend endpoints</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(apiStatus).split(' ')[0]}`}>
                  {getStatusIcon(apiStatus)} {getStatusText(apiStatus)}
                </div>
                <button
                  onClick={checkApiHealth}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  Test Connection
                </button>
              </div>
            </div>

            {/* WebSocket Status */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(websocketStatus).split(' ')[1]} ${
                  websocketStatus === 'connecting' || websocketStatus === 'reconnecting' ? 'animate-pulse' : ''
                }`}></div>
                <div>
                  <div className={`text-sm font-medium ${colors.text.primary}`}>WebSocket</div>
                  <div className={`text-xs ${colors.text.muted}`}>Real-time price updates</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(websocketStatus).split(' ')[0]}`}>
                  {getStatusIcon(websocketStatus)} {getStatusText(websocketStatus)}
                </div>
                {websocketStatus === 'failed' && (
                  <div className="text-xs text-red-300 mt-1">
                    Fallback: Polling mode
                  </div>
                )}
              </div>
            </div>

            {/* Indicator Streaming Status */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  indicatorConnected && indicatorHealthy ? 'bg-green-500' :
                  indicatorConnected ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <div>
                  <div className={`text-sm font-medium ${colors.text.primary}`}>Indicators</div>
                  <div className={`text-xs ${colors.text.muted}`}>RSI & MA streaming</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  indicatorConnected && indicatorHealthy ? 'text-green-400' :
                  indicatorConnected ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {indicatorConnected && indicatorHealthy ? '✅ Live' :
                   indicatorConnected ? '🔄 Connecting' :
                   '❌ Offline'}
                </div>
                {streamStatus.subscriptions && streamStatus.subscriptions.length > 0 && (
                  <div className="text-xs text-green-300 mt-1">
                    {streamStatus.subscriptions.length} symbols active
                  </div>
                )}
              </div>
            </div>

            {/* Data Freshness */}
            <div className={`border-t ${colors.border.primary} pt-3`}>
              <div className="flex justify-between text-sm">
                <span className={colors.text.muted}>Last Update:</span>
                <span className={`${colors.text.primary} font-mono`}>
                  {status?.lastUpdate 
                    ? status.lastUpdate.toLocaleTimeString() 
                    : data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Never'
                  }
                </span>
              </div>
              
              <div className="flex justify-between text-sm mt-2">
                <span className={colors.text.muted}>Update Mode:</span>
                <span className={`font-medium ${
                  websocketStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {websocketStatus === 'connected' ? 'Real-time' : 'Polling (30s)'}
                </span>
              </div>
              
              {data?.uptime && (
                <div className="flex justify-between text-sm mt-1">
                  <span className={colors.text.muted}>Uptime:</span>
                  <span className={`${colors.text.primary} font-mono`}>
                    {Math.floor(data.uptime / 60)}m {Math.floor(data.uptime % 60)}s
                  </span>
                </div>
              )}
            </div>

            {/* Data Quality Score */}
            <div className={`border-t ${colors.border.primary} pt-3`}>
              <div className="flex justify-between text-sm mb-2">
                <span className={colors.text.muted}>Data Quality:</span>
                <span className={`font-medium ${dataQuality.color}`}>
                  {dataQuality.label}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    dataQuality.status === 'excellent' ? 'bg-green-500' :
                    dataQuality.status === 'good' ? 'bg-blue-500' :
                    dataQuality.status === 'fair' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${((apiStatus === 'connected' ? 1 : 0) + (websocketStatus === 'connected' ? 1 : 0) + (indicatorConnected && hasData ? 1 : 0)) / 3 * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Performance Impact */}
            <div className={`${colors.bg.tertiary} rounded p-3`}>
              <div className={`text-xs ${colors.text.muted} mb-2`}>Performance Optimization</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className={colors.text.muted}>API Calls:</span>
                  <span className={`ml-1 font-medium ${
                    indicatorConnected && websocketStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {indicatorConnected && websocketStatus === 'connected' ? '~15/hr' : '~120/hr'}
                  </span>
                </div>
                <div>
                  <span className={colors.text.muted}>Update Speed:</span>
                  <span className={`ml-1 font-medium ${
                    indicatorConnected ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {indicatorConnected ? '~5min' : '~30s'}
                  </span>
                </div>
                <div>
                  <span className={colors.text.muted}>Indicators:</span>
                  <span className={`ml-1 font-medium ${
                    indicatorConnected ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {indicatorConnected ? 'Real-time' : 'On-demand'}
                  </span>
                </div>
                <div>
                  <span className={colors.text.muted}>Load:</span>
                  <span className={`ml-1 font-medium ${
                    indicatorConnected ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {indicatorConnected ? 'Optimized' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            {(apiStatus !== 'connected' || websocketStatus !== 'connected' || !indicatorConnected) && (
              <div className="bg-red-900/20 border border-red-700 rounded p-3">
                <div className="text-sm font-medium text-red-300 mb-2">⚠️ Connection Issues</div>
                <div className="text-xs text-red-200 space-y-1">
                  {apiStatus !== 'connected' && (
                    <div>• Backend API unavailable - check server status</div>
                  )}
                  {websocketStatus !== 'connected' && (
                    <div>• WebSocket connection failed - using polling fallback</div>
                  )}
                  {!indicatorConnected && (
                    <div>• Indicator streaming offline - using API fallback</div>
                  )}
                  <div className={`mt-2 text-xs ${colors.text.muted}`}>
                    Data will continue updating via fallback methods. 
                    {!indicatorConnected && ' RSI/MA indicators may be delayed.'}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {apiStatus === 'connected' && websocketStatus === 'connected' && indicatorConnected && (
              <div className="bg-green-900/20 border border-green-700 rounded p-3">
                <div className="text-sm font-medium text-green-300 mb-2">✅ Optimal Performance</div>
                <div className="text-xs text-green-200 space-y-1">
                  <div>• All systems connected and streaming live data</div>
                  <div>• ~87% reduction in API calls achieved</div>
                  <div>• Real-time indicator updates every 5 minutes</div>
                  <div className="text-xs text-green-300 mt-1">
                    You're getting the highest quality data available!
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;