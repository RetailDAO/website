import { useState } from 'react';
import { X, Settings, Activity, TrendingUp, BarChart3, RefreshCw, Database, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ConnectionStatus from './ConnectionStatus';
import ThemeToggle from './ThemeToggle';

const Sidebar = ({ 
  isOpen, 
  toggleSidebar, 
  fetchMarketData, 
  loading, 
  useRealAPI, 
  setUseRealAPI, 
  testRSIScenario, 
  rsiScenario,
  connectionStatus 
}) => {
  const { colors } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const menuItems = [
    { 
      id: 'dashboard',
      name: 'Dashboard', 
      icon: <Activity size={20} />, 
      active: true,
      description: 'Main analytics view'
    },
    { 
      id: 'analytics',
      name: 'Additional', 
      icon: <BarChart3 size={20} />,
      description: 'Advanced market analytics'
    },
    { 
      id: 'trading',
      name: 'Features to', 
      icon: <TrendingUp size={20} />,
      description: 'AI-powered trading insights'
    },
    { 
      id: 'rsi',
      name: 'Implement', 
      icon: <Zap size={20} />,
      description: 'Technical indicators & oscillators'
    },
    { 
      id: 'settings',
      name: 'Settings', 
      icon: <Settings size={20} />,
      description: 'Dashboard configuration'
    },
  ];

  const rsiScenarios = [
    { id: 'normal', name: 'Normal', description: 'Balanced market conditions', color: 'bg-blue-600' },
    { id: 'overbought', name: 'Overbought', description: 'RSI > 70, potential sell signal', color: 'bg-red-600' },
    { id: 'oversold', name: 'Oversold', description: 'RSI < 30, potential buy signal', color: 'bg-green-600' },
    { id: 'volatile', name: 'Volatile', description: 'High volatility conditions', color: 'bg-purple-600' }
  ];

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-80 md:w-80';

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-all duration-600 ease-in-out ${colors.bg.secondary} ${colors.border.primary} border-r overflow-y-auto md:relative md:translate-x-0 shadow-2xl`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${colors.border.primary} sticky top-0 ${colors.bg.secondary} z-10`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <img 
              src="/discord_profile_picture.png" 
              alt="RetailDAO Logo" 
              className="w-8 h-8 rounded-lg object-cover"
            />
            <h2 className={`text-lg font-bold ${colors.text.primary}`}>RetailDAO</h2>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          {/* Collapse/Expand Toggle (Desktop Only) */}
          <button 
            onClick={toggleCollapsed}
            className={`hidden md:flex p-1.5 ${colors.bg.tertiary} rounded-lg ${colors.bg.hover} transition-all duration-400 ${colors.text.primary}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile Close Button */}
          <button 
            onClick={toggleSidebar} 
            className={`md:hidden p-2 ${colors.bg.tertiary} rounded-lg ${colors.bg.hover} transition-all duration-400 ${colors.text.primary} hover:bg-red-600 hover:text-white`}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="p-4">
        <div className={`${!isCollapsed ? 'mb-4' : 'mb-2'}`}>
          <h3 className={`text-xs font-semibold ${colors.text.muted} uppercase tracking-wider ${isCollapsed ? 'sr-only' : ''}`}>
            Navigation
          </h3>
        </div>
        
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-start p-3'} rounded-lg transition-all duration-400 ${
                  activeSection === item.id 
                    ? 'bg-[#fbc318] text-white shadow-lg hover:bg-[#e6ae15]' 
                    : `${colors.bg.tertiary} hover:${colors.bg.hover} ${colors.text.secondary} hover:${colors.text.primary}`
                }`}
                title={isCollapsed ? `${item.name}: ${item.description}` : undefined}
              >
                <span className={`${activeSection === item.id ? 'text-white' : colors.text.primary}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <div className="ml-3 text-left">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className={`text-xs ${activeSection === item.id ? 'text-white/80' : colors.text.muted}`}>
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {!isCollapsed && (
        <>
          {/* Connection Status Section */}
          <div className="px-4 mb-6">
            <div className="mb-3">
              <h3 className={`text-xs font-semibold ${colors.text.muted} uppercase tracking-wider`}>
                Connection Status
              </h3>
            </div>
            <ConnectionStatus websocketStatus={connectionStatus} className="w-full" />
          </div>

          {/* Controls Section */}
          <div className="px-4 mb-6">
            <div className="mb-3">
              <h3 className={`text-xs font-semibold ${colors.text.muted} uppercase tracking-wider`}>
                Dashboard Controls
              </h3>
            </div>
            
            <div className="space-y-3">
              {/* Theme Toggle */}
              <div className={`flex items-center justify-between p-4 ${colors.bg.tertiary} rounded-lg touch-manipulation`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 ${colors.bg.card} rounded-md`}>
                    <span className="text-lg">🎨</span>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${colors.text.primary}`}>Theme</div>
                    <div className={`text-xs ${colors.text.muted}`}>Toggle appearance</div>
                  </div>
                </div>
                <ThemeToggle />
              </div>

              {/* Data Source Toggle */}
              <div className={`p-4 ${colors.bg.tertiary} rounded-lg touch-manipulation`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 ${colors.bg.card} rounded-md`}>
                      <Database size={16} />
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${colors.text.primary}`}>Data Source</div>
                      <div className={`text-xs ${colors.text.muted}`}>API vs Mock data</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setUseRealAPI(true)}
                    disabled={loading}
                    className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all duration-400 touch-manipulation ${
                      useRealAPI 
                        ? 'bg-green-600 text-white shadow-md hover:bg-green-700' 
                        : `${colors.bg.card} ${colors.text.muted} hover:${colors.bg.hover}`
                    }`}
                  >
                    🌐 Live API
                  </button>
                  <button
                    onClick={() => setUseRealAPI(false)}
                    disabled={loading}
                    className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all duration-400 touch-manipulation ${
                      !useRealAPI 
                        ? 'bg-[#fbc318] text-white shadow-md hover:bg-[#e6ae15]' 
                        : `${colors.bg.card} ${colors.text.muted} hover:${colors.bg.hover}`
                    }`}
                  >
                    🎭 Mock
                  </button>
                </div>
              </div>

              {/* Refresh Button */}
              <button 
                onClick={fetchMarketData}
                disabled={loading}
                className={`w-full flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-[#fbc318] to-[#e6ae15] hover:from-[#e6ae15] hover:to-[#d19b12] text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="text-sm font-medium">
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </span>
              </button>
            </div>
          </div>

          {/* RSI Testing Section - Only show for mock data */}
          {!useRealAPI && (
            <div className="px-4 mb-6">
              <div className="mb-3">
                <h3 className={`text-xs font-semibold ${colors.text.muted} uppercase tracking-wider`}>
                  RSI Testing
                </h3>
                <p className={`text-xs ${colors.text.muted} mt-1`}>
                  Test different market conditions
                </p>
              </div>
              
              <div className="space-y-2">
                {rsiScenarios.map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => testRSIScenario(scenario.id)}
                    disabled={loading}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                      rsiScenario === scenario.id 
                        ? `${scenario.color} text-white shadow-lg` 
                        : `${colors.bg.tertiary} ${colors.bg.hover} hover:shadow-md`
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      rsiScenario === scenario.id ? 'text-white' : colors.text.primary
                    }`}>
                      {scenario.name}
                    </div>
                    <div className={`text-xs mt-1 ${
                      rsiScenario === scenario.id ? 'text-white/80' : colors.text.muted
                    }`}>
                      {scenario.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Current Scenario Indicator */}
              <div className={`mt-3 p-2 ${colors.bg.card} rounded-md border-l-4 border-[#fbc318]`}>
                <div className={`text-xs ${colors.text.muted}`}>Active Scenario:</div>
                <div className={`text-sm font-semibold ${colors.text.primary} capitalize`}>
                  {rsiScenario}
                </div>
              </div>
            </div>
          )}

          {/* Market Status */}
          <div className="px-4 mb-6">
            <div className="mb-3">
              <h3 className={`text-xs font-semibold ${colors.text.muted} uppercase tracking-wider`}>
                Market Status
              </h3>
            </div>
            
            <div className={`p-3 ${colors.bg.tertiary} rounded-lg space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${colors.text.muted}`}>Market Hours:</span>
                <span className="text-xs text-green-400">24/7 Open</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${colors.text.muted}`}>Data Mode:</span>
                <span className={`text-xs ${useRealAPI ? 'text-green-400' : 'text-orange-400'}`}>
                  {useRealAPI ? 'Live' : 'Demo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${colors.text.muted}`}>Last Update:</span>
                <span className={`text-xs ${colors.text.primary}`}>
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-4 py-3 border-t border-gray-700 mt-auto">
            <div className={`text-center ${colors.text.muted}`}>
              <div className="text-xs mb-2">RetailDAO Analytics</div>
              <div className="text-xs opacity-60">v1.0.0 • Dashboard</div>
              <div className="text-xs opacity-60 mt-1">
                Built by Triple Tres with React 
              </div>
            </div>
          </div>
        </>
      )}

      {/* Collapsed State Content */}
      {isCollapsed && (
        <div className="px-2 space-y-4">
          {/* Quick Status Icons */}
          <div className="flex flex-col items-center space-y-3">
            {/* Connection Status Mini */}
            <div 
              className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-red-500'
              }`}
              title={`Connection: ${connectionStatus}`}
            />
            
            {/* Data Source Indicator */}
            <div 
              className={`text-lg ${useRealAPI ? '🌐' : '🎭'}`}
              title={useRealAPI ? 'Live API Data' : 'Mock Data'}
            />
            
            {/* Refresh Button Mini */}
            <button 
              onClick={fetchMarketData}
              disabled={loading}
              className={`p-2 bg-[#fbc318] hover:bg-[#e6ae15] text-white rounded-lg transition-all duration-200 disabled:opacity-50`}
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;