/**
 * Under Construction Page
 * 
 * Professional terminal-style under construction page for future features
 * Matches Bloomberg terminal aesthetic with animated elements
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const UnderConstruction = ({ featureName, description, estimatedCompletion }) => {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  // Animated loading dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Terminal-style loading animation
  const [terminalLines, setTerminalLines] = useState([]);

  useEffect(() => {
    const lines = [
      '> Initializing system modules...',
      '> Loading dependencies...',
      '> Configuring data streams...',
      '> Establishing API connections...',
      '> Building user interface...',
      `> Preparing ${featureName}...`,
      '> Status: Under Development'
    ];

    lines.forEach((line, index) => {
      setTimeout(() => {
        setTerminalLines(prev => [...prev, line]);
      }, index * 300);
    });
  }, [featureName]);

  return (
    <div className={`min-h-screen ${colors.bg.primary} ${colors.text.primary} p-8`}>
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-mono uppercase tracking-wider ${colors.text.primary} mb-2`}>
              [SYSTEM_STATUS]
            </h1>
            <div className={`text-sm ${colors.text.secondary}`}>
              RetailDAO Terminal v2.0.0 • Development Environment
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className={`
              px-4 py-2 text-sm font-mono uppercase tracking-wider border
              ${colors.border.primary} ${colors.text.accent} 
              hover:${colors.bg.tertiary} transition-all duration-300
              hover:animate-glow hover:scale-105
            `}
            style={{ borderRadius: '0px' }}
          >
            [BACK]
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Feature Info */}
          <div className={`border ${colors.border.primary} p-6`} style={{ borderRadius: '0px' }}>
            <div className="mb-6">
              <h2 className={`text-xl font-mono uppercase tracking-wider ${colors.text.primary} mb-4`}>
                [{featureName?.toUpperCase() || 'FEATURE'}]
              </h2>
              
              {/* Construction Icon */}
              <div className="text-center mb-6">
                <div className={`text-6xl ${colors.text.accent} mb-4 animate-float`}>
                  🚧
                </div>
                <div className={`text-sm font-mono uppercase tracking-wider ${colors.text.secondary} typing-animation`}>
                  UNDER_CONSTRUCTION{dots}
                </div>
              </div>

              {/* Feature Description */}
              <div className={`${colors.text.secondary} mb-6`}>
                <div className="text-sm font-mono uppercase tracking-wider mb-2">[DESCRIPTION]</div>
                <div className="text-sm leading-relaxed">
                  {description || `${featureName} is currently in active development. This feature will provide advanced market analysis and trading tools for the RetailDAO community.`}
                </div>
              </div>

              {/* Estimated Completion */}
              {estimatedCompletion && (
                <div className={`${colors.text.secondary} mb-4`}>
                  <div className="text-sm font-mono uppercase tracking-wider mb-2">[ETA]</div>
                  <div className={`text-sm ${colors.text.accent}`}>
                    {estimatedCompletion}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="text-sm font-mono uppercase tracking-wider mb-2">[PROGRESS]</div>
                <div className={`border ${colors.border.primary} h-4 relative overflow-hidden`}>
                  <div 
                    className={`h-full ${colors.bg.accent} opacity-30 animate-pulse`}
                    style={{ width: '35%' }}
                  ></div>
                  <div className={`absolute inset-0 flex items-center justify-center text-xs font-mono ${colors.text.primary}`}>
                    35% COMPLETE
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Terminal Output */}
          <div className={`border ${colors.border.primary} p-6`} style={{ borderRadius: '0px' }}>
            <div className="mb-4">
              <h3 className={`text-lg font-mono uppercase tracking-wider ${colors.text.primary} mb-4`}>
                [TERMINAL_OUTPUT]
              </h3>
            </div>

            {/* Terminal Window */}
            <div className={`${colors.bg.secondary} border ${colors.border.primary} p-4 font-mono text-sm`}>
              {/* Terminal Header */}
              <div className={`flex items-center justify-between pb-2 mb-4 border-b ${colors.border.primary}`}>
                <div className={`${colors.text.accent}`}>
                  retauldao@terminal:~$
                </div>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>

              {/* Terminal Content */}
              <div className="space-y-2 min-h-48">
                {terminalLines.map((line, index) => (
                  <div key={index} className={`${colors.text.secondary} animate-fade-in`}>
                    <span className={`${colors.text.accent}`}>$</span> {line}
                  </div>
                ))}
                
                {terminalLines.length >= 7 && (
                  <div className={`${colors.text.accent} animate-pulse mt-4`}>
                    $ █
                  </div>
                )}
              </div>
            </div>

            {/* Status Information */}
            <div className="mt-6 space-y-3">
              <div className={`text-xs ${colors.text.muted}`}>
                <span className="font-mono uppercase tracking-wider">Status:</span> Development Phase
              </div>
              <div className={`text-xs ${colors.text.muted}`}>
                <span className="font-mono uppercase tracking-wider">Priority:</span> High
              </div>
              <div className={`text-xs ${colors.text.muted}`}>
                <span className="font-mono uppercase tracking-wider">Team:</span> RetailDAO Core
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-8 pt-6 border-t ${colors.border.primary} text-center`}>
          <div className={`text-sm ${colors.text.muted} mb-4`}>
            Stay tuned for updates on this exciting new feature!
          </div>
          <div className={`text-xs ${colors.text.muted} font-mono`}>
            🚀 Building the future of DeFi analytics • RetailDAO Terminal v2.0.0
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }
        
        .typing-animation {
          overflow: hidden;
          white-space: nowrap;
          animation: typing 3s steps(40, end);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// Pre-configured components for each feature
export const OpportunityRadarConstruction = () => (
  <UnderConstruction
    featureName="Opportunity Radar"
    description="Advanced DeFi opportunity scanning system with real-time yield farming, arbitrage detection, and risk-adjusted return calculations. Will feature automated opportunity ranking and alert system."
    estimatedCompletion="Q1 2025"
  />
);

export const ResourcesConstruction = () => (
  <UnderConstruction
    featureName="Resources"
    description="Comprehensive educational hub featuring trading guides, DeFi protocols analysis, risk management tools, and community-contributed content for all skill levels."
    estimatedCompletion="Q4 2024"
  />
);

export const KOLCallTrackerConstruction = () => (
  <UnderConstruction
    featureName="KOL Call Tracker"
    description="Advanced tracking system for Key Opinion Leader calls and predictions with performance analytics, accuracy scoring, and automated alert system for high-conviction calls."
    estimatedCompletion="Q2 2025"
  />
);

export const TokenomicsDashboardConstruction = () => (
  <UnderConstruction
    featureName="Tokenomics Dashboard"
    description="Deep tokenomics analysis platform featuring supply dynamics, emission schedules, holder distribution, and advanced metrics for token fundamental analysis."
    estimatedCompletion="Q1 2025"
  />
);

export default UnderConstruction;