import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Three professional terminal themes for institutional trading interface
const themes = {
  // Theme 1: Bloomberg Terminal-inspired (default)
  bloomberg: {
    name: 'Traditional Terminal',
    font: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    bg: {
      primary: 'bg-black',              // Pure black main background
      secondary: 'bg-gray-950',         // Cards background
      tertiary: 'bg-gray-900',          // Accent panels
      card: 'bg-gray-950/95',           // Card background with subtle transparency
      hover: 'hover:bg-gray-900/50'     // Minimal hover effect
    },
    text: {
      primary: 'text-orange-400',       // Bloomberg signature orange
      secondary: 'text-white',          // Pure white for data
      tertiary: 'text-gray-300',        // Secondary information
      muted: 'text-gray-500',           // Labels and metadata
      accent: 'text-blue-400',          // Accent highlights
      positive: 'text-green-400',       // Positive values
      negative: 'text-red-400',         // Negative values
      neutral: 'text-gray-300',         // Neutral values
      highlight: 'text-yellow-400'      // Key metrics
    },
    border: {
      primary: 'border-gray-800',       // Subtle card borders
      secondary: 'border-gray-700',     // Section dividers
      hover: 'hover:border-orange-500/30' // Orange accent on hover
    },
    shadow: {
      card: '',                         // No shadows for flat aesthetic
      glow: 'shadow-orange-500/20'      // Subtle glow for important elements
    },
    chart: {
      background: 'transparent',
      text: '#fb923c',                  // Orange for chart text
      grid: '#1f2937',
      axis: '#6b7280',
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#6b7280'
    }
  },

  // Theme 2: High-contrast accessibility theme
  accessible: {
    name: 'High Contrast',
    font: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    bg: {
      primary: 'bg-black',              // Pure black for maximum contrast
      secondary: 'bg-gray-900',         // Darker cards for separation
      tertiary: 'bg-gray-800',          // Accent areas
      card: 'bg-gray-900',              // Solid card backgrounds
      hover: 'hover:bg-gray-800'        // Clear hover state
    },
    text: {
      primary: 'text-white',            // Pure white primary text (WCAG AAA)
      secondary: 'text-gray-100',       // High contrast secondary
      tertiary: 'text-gray-200',        // Still high contrast
      muted: 'text-gray-400',           // Muted but still readable
      accent: 'text-blue-300',          // Accessible blue
      positive: 'text-green-300',       // High contrast green
      negative: 'text-red-300',         // High contrast red
      neutral: 'text-gray-200',         // High contrast neutral
      highlight: 'text-yellow-300'      // Accessible yellow
    },
    border: {
      primary: 'border-gray-600',       // More visible borders
      secondary: 'border-gray-500',     // Clear section separation
      hover: 'hover:border-blue-400'    // Clear hover indication
    },
    shadow: {
      card: 'ring-1 ring-gray-600',     // Ring instead of shadow for clarity
      glow: 'ring-2 ring-blue-400/50'   // Strong glow for focus
    },
    chart: {
      background: 'transparent',
      text: '#ffffff',                  // Pure white for text
      grid: '#374151',                  // Visible grid lines
      axis: '#9ca3af',                  // Clear axis
      positive: '#86efac',              // High contrast green
      negative: '#fca5a5',              // High contrast red
      neutral: '#d1d5db'                // High contrast neutral
    }
  },

  // Theme 3: Retro terminal theme
  retro: {
    name: 'Retro Terminal',
    font: '"JetBrains Mono", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    bg: {
      primary: 'bg-black',              // Classic terminal black
      secondary: 'bg-black',            // Consistent background
      tertiary: 'bg-gray-950',          // Minimal variation
      card: 'bg-black',                 // Pure black cards
      hover: 'hover:bg-green-950/20'    // Subtle green hover
    },
    text: {
      primary: 'text-green-400',        // Classic terminal green
      secondary: 'text-green-300',      // Slightly dimmer green
      tertiary: 'text-green-500',       // Brighter green for emphasis
      muted: 'text-green-600',          // Darker green for labels
      accent: 'text-green-200',         // Light green accent
      positive: 'text-green-400',       // Green for positive (consistent)
      negative: 'text-red-400',         // Red for negative (traditional)
      neutral: 'text-green-500',        // Green neutral
      highlight: 'text-green-200'       // Bright green highlight
    },
    border: {
      primary: 'border-green-800',      // Dark green borders
      secondary: 'border-green-700',    // Slightly brighter
      hover: 'hover:border-green-500'   // Bright green on hover
    },
    shadow: {
      card: '',                         // No shadows for authentic terminal feel
      glow: 'shadow-green-400/30'       // Green terminal glow
    },
    chart: {
      background: 'transparent',
      text: '#4ade80',                  // Terminal green
      grid: '#166534',                  // Dark green grid
      axis: '#22c55e',                  // Green axis
      positive: '#4ade80',              // Bright green
      negative: '#ef4444',              // Red for contrast
      neutral: '#22c55e'                // Medium green
    }
  }
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Default to Bloomberg theme
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('terminalTheme');
    return saved && themes[saved] ? saved : 'bloomberg';
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('terminalTheme', currentTheme);
    
    // Apply theme classes to document
    const themeKeys = Object.keys(themes);
    document.documentElement.classList.remove(...themeKeys);
    document.documentElement.classList.add(currentTheme);
    
    // Apply theme-specific font to body
    const theme = themes[currentTheme];
    if (theme) {
      document.body.style.fontFamily = theme.font;
      document.body.style.backgroundColor = '#000000'; // All themes use black background
      document.body.style.color = theme.chart.text; // Set default text color
    }
  }, [currentTheme]);

  // Cycle through themes: Bloomberg → Accessible → Retro → Bloomberg
  const cycleTheme = () => {
    setCurrentTheme(prev => {
      switch (prev) {
        case 'bloomberg': return 'accessible';
        case 'accessible': return 'retro';
        case 'retro': return 'bloomberg';
        default: return 'bloomberg';
      }
    });
  };

  // Direct theme setter
  const setTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const theme = themes[currentTheme] || themes.bloomberg;
  
  const value = {
    // Current theme info
    currentTheme,
    themeName: theme.name,
    isBloomberg: currentTheme === 'bloomberg',
    isAccessible: currentTheme === 'accessible',
    isRetro: currentTheme === 'retro',
    
    // Theme controls
    cycleTheme,
    setTheme,
    
    // Theme data
    colors: theme,
    font: theme.font,
    
    // Backward compatibility
    isDark: true, // All themes are dark
    theme: currentTheme,
    
    // Helper function to get classes
    getClasses: (category, type = 'primary') => {
      return theme[category]?.[type] || '';
    },
    
    // Available themes list
    availableThemes: Object.keys(themes)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};