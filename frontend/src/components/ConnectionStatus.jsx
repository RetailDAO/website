import { useState } from 'react';
import { useConnectionStatus } from '../hooks/useWebSocket';
import { useTheme } from '../context/ThemeContext';

const ConnectionStatus = ({ websocketStatus = 'disconnected', className = '' }) => {
  const { status, checkApiHealth } = useConnectionStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();
  
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
          apiStatus === 'connected' && websocketStatus === 'connected' 
            ? 'bg-green-500 animate-pulse' 
            : apiStatus === 'connected' || websocketStatus === 'connected'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-red-500'
        }`}></div>
        
        <span className={`text-sm ${colors.text.secondary}`}>
          {apiStatus === 'connected' && websocketStatus === 'connected' ? 'Live' : 'Limited'}
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
                  <div className={`text-xs ${colors.text.muted}`}>Real-time updates</div>
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

            {/* Performance Info */}
            <div className={`${colors.bg.tertiary} rounded p-3`}>
              <div className={`text-xs ${colors.text.muted} mb-2`}>Performance Impact</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className={colors.text.muted}>API Calls:</span>
                  <span className={`ml-1 font-medium ${
                    websocketStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {websocketStatus === 'connected' ? '~40/hr' : '~120/hr'}
                  </span>
                </div>
                <div>
                  <span className={colors.text.muted}>Latency:</span>
                  <span className={`ml-1 font-medium ${
                    websocketStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {websocketStatus === 'connected' ? '<100ms' : '~30s'}
                  </span>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            {(apiStatus !== 'connected' || websocketStatus !== 'connected') && (
              <div className="bg-red-900/20 border border-red-700 rounded p-3">
                <div className="text-sm font-medium text-red-300 mb-2">⚠️ Connection Issues</div>
                <div className="text-xs text-red-200 space-y-1">
                  {apiStatus !== 'connected' && (
                    <div>• Backend API unavailable - check server status</div>
                  )}
                  {websocketStatus !== 'connected' && (
                    <div>• WebSocket connection failed - using polling fallback</div>
                  )}
                  <div className={`mt-2 text-xs ${colors.text.muted}`}>
                    Data will continue updating via fallback methods
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