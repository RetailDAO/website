import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './GlitchButton.css';

const GlitchButton = ({
  text,
  statusType = 'neutral', // 'easing', 'neutral', 'tightening'
  size = 'sm',
  className = ''
}) => {
  const { currentTheme, colors } = useTheme();

  // Status color mapping based on state
  const getStatusColors = () => {
    switch (statusType) {
      case 'easing':
        return {
          base: '#10b981', // Green
          hover: '#10b981',
          text: currentTheme === 'retro' ? '#000000' : '#ffffff'
        };
      case 'tightening':
        return {
          base: '#ef4444', // Red
          hover: '#ef4444',
          text: currentTheme === 'retro' ? '#000000' : '#ffffff'
        };
      case 'neutral':
      default:
        return {
          base: '#f59e0b', // Yellow
          hover: '#f59e0b',
          text: currentTheme === 'retro' ? '#000000' : '#ffffff'
        };
    }
  };

  const statusColors = getStatusColors();

  // Size variants
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-w-[80px]',
    sm: 'px-3 py-1.5 text-xs min-w-[100px]',
    md: 'px-4 py-2 text-sm min-w-[120px]',
    lg: 'px-5 py-2.5 text-base min-w-[140px]'
  };

  // Theme-specific styling
  const themeClasses = currentTheme === 'retro' ? 'font-mono' : '';

  return (
    <button
      className={`
        glitch-btn inline-block cursor-pointer uppercase
        ${sizeClasses[size]} ${themeClasses} ${className}
        transition-all duration-200 ease-in-out
        border rounded-xl
      `}
      style={{
        borderColor: statusColors.base,
        color: statusColors.base,
        backgroundColor: 'transparent',
        '--status-color': statusColors.base,
        '--status-hover': statusColors.hover,
        '--status-text': statusColors.text
      }}
    >
      <span>
        {text}
      </span>
    </button>
  );
};

export default GlitchButton;