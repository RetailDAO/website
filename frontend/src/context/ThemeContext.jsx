import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Comprehensive theme colors
const themes = {
  light: {
    // Backgrounds
    bg: {
      primary: 'bg-[#f9f8f4]',
      secondary: 'bg-white',
      tertiary: 'bg-gray-100',
      card: 'bg-white',
      hover: 'hover:bg-gray-50'
    },
    // Text colors
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-700',
      tertiary: 'text-gray-600',
      muted: 'text-gray-500',
      accent: 'text-[#fbc318]'
    },
    // Borders
    border: {
      primary: 'border-gray-200',
      secondary: 'border-gray-300',
      hover: 'hover:border-gray-400'
    },
    // Shadows
    shadow: {
      card: 'shadow-md hover:shadow-lg',
      glow: 'shadow-blue-500/20'
    },
    // Chart specific
    chart: {
      background: '#ffffff',
      text: '#374151',
      grid: '#E5E7EB',
      axis: '#9CA3AF'
    }
  },
  dark: {
    // Backgrounds
    bg: {
      primary: 'bg-gray-950',
      secondary: 'bg-gray-900',
      tertiary: 'bg-gray-800',
      card: 'bg-gray-900',
      hover: 'hover:bg-gray-800'
    },
    // Text colors
    text: {
      primary: 'text-white',
      secondary: 'text-gray-100',
      tertiary: 'text-gray-300',
      muted: 'text-gray-400',
      accent: 'text-orange-400'
    },
    // Borders
    border: {
      primary: 'border-gray-700',
      secondary: 'border-gray-600',
      hover: 'hover:border-gray-500'
    },
    // Shadows
    shadow: {
      card: 'shadow-xl hover:shadow-2xl',
      glow: 'shadow-orange-500/20'
    },
    // Chart specific
    chart: {
      background: 'transparent',
      text: '#D1D5DB',
      grid: '#374151',
      axis: '#9CA3AF'
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
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('darkMode', JSON.stringify(isDark));
    
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const currentTheme = isDark ? 'dark' : 'light';
  const value = {
    isDark,
    toggleTheme,
    theme: currentTheme,
    colors: themes[currentTheme],
    // Helper function to get classes
    getClasses: (category, type = 'primary') => {
      return themes[currentTheme][category]?.[type] || '';
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};