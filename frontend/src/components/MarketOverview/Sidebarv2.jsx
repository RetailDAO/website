// Interactive Terminal-style Sidebar with fixed positioning
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Sidebarv2 = React.memo(() => {
  const { colors } = useTheme();
  const navigate = useNavigate();
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
    { 
      id: 'overview', 
      label: 'Market Overview', 
      icon: '📊', 
      active: true, 
      route: '/',
      status: 'LIVE'
    },
    { 
      id: 'opportunity', 
      label: 'Opportunity Radar', 
      icon: '🎯', 
      active: false, 
      route: '/opportunity-radar',
      status: 'COMING_SOON',
      description: 'Advanced DeFi opportunity scanner'
    },
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: '📚', 
      active: false, 
      route: '/resources',
      status: 'COMING_SOON',
      description: 'Educational hub & guides'
    },
    { 
      id: 'kol-tracker', 
      label: 'KOL Call Tracker', 
      icon: '📢', 
      active: false, 
      route: '/kol-tracker',
      status: 'COMING_SOON',
      description: 'Track influencer predictions'
    },
    { 
      id: 'tokenomics', 
      label: 'Tokenomics Dashboard', 
      icon: '🪙', 
      active: false, 
      route: '/tokenomics',
      status: 'COMING_SOON',
      description: 'Deep tokenomics analysis'
    }
  ];

  // Handle navigation
  const handleNavigation = (item) => {
    if (item.status === 'LIVE') {
      navigate(item.route);
    } else {
      navigate(item.route);
    }
    setIsOpen(false); // Close sidebar after navigation
  };

  return (
    <>
      {/* Enhanced Toggle Button - More visible when sidebar is hidden */}
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
            px-3 py-6 font-mono text-xs uppercase tracking-wider
            transition-all duration-300 ease-in-out
            hover:${colors.text.primary} hover:${colors.bg.tertiary} focus:outline-none
            shadow-lg hover:shadow-xl
            ${isHovered || isOpen ? 'translate-x-0' : '-translate-x-2'}
            ${!isOpen ? 'hover:scale-105' : ''}
          `}
          style={{ 
            borderRadius: '0px',
            borderTopLeftRadius: '0px',
            borderBottomLeftRadius: '0px',
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px'
          }}
          title="Toggle Terminal Navigation"
        >
          <div className="flex flex-col items-center space-y-2">
            <span className={`text-[10px] opacity-80 ${!isOpen ? 'animate-pulse' : ''}`}>
              {isOpen ? 'CLOSE' : 'MENU'}
            </span>
            <div className="w-5 h-4 flex flex-col justify-between">
              <div className={`w-full h-0.5 ${colors.bg.accent} transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5 bg-red-400' : ''}`}></div>
              <div className={`w-full h-0.5 ${colors.bg.accent} transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></div>
              <div className={`w-full h-0.5 ${colors.bg.accent} transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5 bg-red-400' : ''}`}></div>
            </div>
            {!isOpen && (
              <div className={`text-[8px] ${colors.text.muted} mt-1 opacity-60`}>
                5
              </div>
            )}
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
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className={`${colors.text.secondary} font-mono text-sm uppercase mb-4`}>
            [NAVIGATION]
          </h3>
          <nav className="space-y-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`
                  w-full text-left p-3 font-mono text-sm
                  ${colors.border.primary} border rounded-none
                  ${item.active 
                    ? `${colors.text.primary} ${colors.bg.tertiary}` 
                    : `${colors.text.secondary} hover:${colors.text.primary} hover:${colors.bg.hover}`
                  }
                  transition-all duration-200 group
                  ${item.status === 'COMING_SOON' ? 'hover:border-yellow-500' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex flex-col">
                      <span className="uppercase tracking-wide text-xs">
                        {item.label}
                      </span>
                      {item.description && (
                        <span className={`text-[10px] ${colors.text.muted} opacity-60 mt-0.5`}>
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1">
                    {item.status === 'LIVE' && (
                      <span className={`${colors.text.positive} text-[10px] font-bold`}>
                        ● LIVE
                      </span>
                    )}
                    {item.status === 'COMING_SOON' && (
                      <span className={`text-yellow-500 text-[10px] font-bold animate-pulse`}>
                        ⚡ SOON
                      </span>
                    )}
                    {item.active && (
                      <span className={`${colors.text.accent} text-xs`}>◀</span>
                    )}
                  </div>
                </div>
                
                {/* Coming Soon Indicator */}
                {item.status === 'COMING_SOON' && (
                  <div className={`mt-2 pt-2 border-t ${colors.border.primary} opacity-60`}>
                    <div className={`text-[10px] ${colors.text.muted} flex items-center space-x-1`}>
                      <span>🚧</span>
                      <span>Under Development</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </nav>
          
          {/* Future Features Preview */}
          <div className={`mt-6 p-3 border ${colors.border.primary} ${colors.bg.tertiary} rounded-none`}>
            <h4 className={`${colors.text.accent} font-mono text-xs uppercase mb-2`}>
              [ROADMAP_2025]
            </h4>
            <div className={`text-[10px] ${colors.text.muted} space-y-1`}>
              <div>Q1: KOL Tracker + Tokenomics</div>
              <div>Q2: Opportunity Radar</div>
              <div>Q4: Educational Resources</div>
            </div>
          </div>
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