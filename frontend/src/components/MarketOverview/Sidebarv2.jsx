// Interactive Terminal-style Sidebar with fixed positioning
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const Sidebarv2 = React.memo(() => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarRef = useRef(null);

  // Auto-hide on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // System metrics for techy display
  const systemMetrics = {
    uptime: '2h 34m',
    memory: '1.2GB / 8GB',
    cpu: '23%',
    network: '1.2 Mbps',
    latency: '45ms',
    connections: 1247,
    status: 'ONLINE',
    lastSync: new Date().toLocaleTimeString()
  };

  const navItems = [
    { id: 'overview', label: 'Market Overview', icon: '📊', active: true },
    { id: 'analysis', label: 'Technical Analysis', icon: '📈', active: false },
    { id: 'alerts', label: 'Price Alerts', icon: '🔔', active: false, badge: '3' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼', active: false },
    { id: 'research', label: 'Research Hub', icon: '🔍', active: false },
    { id: 'settings', label: 'Terminal Settings', icon: '⚙️', active: false }
  ];

  return (
    <>
      {/* Toggle Button - Fixed position with high z-index */}
      <div 
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[60]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${colors.bg.secondary} ${colors.border.primary} ${colors.text.accent}
            border-r-2 border-t-2 border-b-2 border-l-0
            px-2 py-4 font-mono text-xs uppercase tracking-wider
            transition-all duration-300 ease-in-out
            hover:${colors.text.primary} focus:outline-none
            ${isHovered || isOpen ? 'translate-x-0' : '-translate-x-1/2'}
          `}
          style={{ 
            borderRadius: '0px',
            borderTopLeftRadius: '0px',
            borderBottomLeftRadius: '0px',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px'
          }}
          title="Toggle Terminal Navigation"
        >
          <div className="flex flex-col items-center space-y-1">
            <span className="text-[10px] opacity-60">NAV</span>
            <div className="w-4 h-3 flex flex-col justify-between">
              <div className={`w-full h-0.5 ${colors.bg.tertiary} transition-transform duration-300 ${isOpen ? 'rotate-45 translate-y-1' : ''}`}></div>
              <div className={`w-full h-0.5 ${colors.bg.tertiary} transition-opacity duration-300 ${isOpen ? 'opacity-0' : ''}`}></div>
              <div className={`w-full h-0.5 ${colors.bg.tertiary} transition-transform duration-300 ${isOpen ? '-rotate-45 -translate-y-1' : ''}`}></div>
            </div>
          </div>
        </button>
      </div>

      {/* Sidebar Panel - Fixed position with high z-index */}
      <div
        ref={sidebarRef}
        className={`
          fixed left-0 top-0 bottom-0 w-80 z-50
          ${colors.bg.primary} ${colors.border.primary}
          border-r-2 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          shadow-2xl shadow-black/50
        `}
        style={{ borderRadius: '0px' }}
      >
        {/* Header */}
        <div className={`${colors.bg.secondary} ${colors.border.primary} border-b-2 p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`${colors.text.primary} font-mono text-lg uppercase tracking-wider`}>
                [TERMINAL_NAV]
              </h2>
              <p className={`${colors.text.muted} text-xs mt-1`}>
                RetailDAO Trading Interface v2.0
              </p>
            </div>
            <div className={`${colors.text.positive} font-mono text-xs`}>
              {systemMetrics.status}
            </div>
          </div>
        </div>

        {/* System Metrics Panel */}
        <div className={`${colors.bg.tertiary} ${colors.border.primary} border-b-2 p-4`}>
          <h3 className={`${colors.text.secondary} font-mono text-sm uppercase mb-3`}>
            [SYSTEM_METRICS]
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className={`${colors.text.muted}`}>
              <span className="opacity-60">UPTIME:</span>
              <span className={`ml-2 ${colors.text.accent}`}>{systemMetrics.uptime}</span>
            </div>
            <div className={`${colors.text.muted}`}>
              <span className="opacity-60">CPU:</span>
              <span className={`ml-2 ${colors.text.positive}`}>{systemMetrics.cpu}</span>
            </div>
            <div className={`${colors.text.muted}`}>
              <span className="opacity-60">MEMORY:</span>
              <span className={`ml-2 ${colors.text.accent}`}>{systemMetrics.memory}</span>
            </div>
            <div className={`${colors.text.muted}`}>
              <span className="opacity-60">LATENCY:</span>
              <span className={`ml-2 ${colors.text.positive}`}>{systemMetrics.latency}</span>
            </div>
            <div className={`${colors.text.muted} col-span-2`}>
              <span className="opacity-60">LAST_SYNC:</span>
              <span className={`ml-2 ${colors.text.secondary}`}>{systemMetrics.lastSync}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 p-4">
          <h3 className={`${colors.text.secondary} font-mono text-sm uppercase mb-4`}>
            [NAVIGATION]
          </h3>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`
                  w-full flex items-center justify-between p-3 font-mono text-sm
                  ${colors.border.primary} border rounded-none
                  ${item.active 
                    ? `${colors.text.primary} ${colors.bg.tertiary}` 
                    : `${colors.text.secondary} hover:${colors.text.primary} hover:${colors.bg.hover}`
                  }
                  transition-all duration-200 uppercase tracking-wide
                `}
                disabled={item.id === 'overview'}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`
                    ${colors.text.primary} ${colors.bg.secondary} 
                    px-2 py-1 text-xs rounded-none font-bold
                  `}>
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <span className={`${colors.text.positive} text-xs`}>●</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className={`${colors.bg.secondary} ${colors.border.primary} border-t-2 p-4`}>
          <div className={`${colors.text.muted} text-xs font-mono space-y-1`}>
            <div className="flex justify-between">
              <span>CONNECTIONS:</span>
              <span className={colors.text.accent}>{systemMetrics.connections.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>NETWORK:</span>
              <span className={colors.text.positive}>{systemMetrics.network}</span>
            </div>
            <div className={`${colors.text.highlight} text-center mt-2 text-[10px] opacity-60`}>
              © 2025 RETAILDAO TERMINAL
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
});

Sidebarv2.displayName = 'Sidebarv2';

export default Sidebarv2;