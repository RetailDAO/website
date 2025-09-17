import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import './GlitchButton.css';

const GlitchButton = ({
  text,
  statusType = 'neutral', // 'easing', 'neutral', 'tightening'
  size = 'xs',
  className = ''
}) => {
  const { currentTheme, colors } = useTheme();
  const [displayText, setDisplayText] = useState(text);
  const [isGlitching, setIsGlitching] = useState(false);
  const intervalRef = useRef(null);

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

  // Glitch characters for animation
  const glitchChars = ['#', '.', '^{', '-!', '#$_', '№:0', '#{+.', '@}-?', '?{4@%', '=.,^!', '?2@%', '\\;1}]', '?{%:%', '|{f[4', '{4%0%', "'1_0<", '{0%', "]>'", '4', '2'];

  // Start glitch animation
  const startGlitch = () => {
    if (isGlitching) return;
    setIsGlitching(true);

    let step = 0;
    const originalText = text;
    const revealDelay = 4; // Steps between each character reveal
    const totalSteps = originalText.length * revealDelay + 10; // Extra steps for final reveal

    // Initialize with all glitch characters
    const initGlitchedText = originalText
      .split('')
      .map(char => char === ' ' ? ' ' : glitchChars[Math.floor(Math.random() * glitchChars.length)])
      .join('');
    setDisplayText(initGlitchedText);

    intervalRef.current = setInterval(() => {
      if (step >= totalSteps) {
        setDisplayText(originalText);
        setIsGlitching(false);
        clearInterval(intervalRef.current);
        return;
      }

      // Create text with progressive reveal from left to right
      const glitchedText = originalText
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' '; // Keep spaces

          // Calculate if this character should be revealed based on step and index
          const revealStep = index * revealDelay;
          const shouldReveal = step >= revealStep;

          return shouldReveal
            ? char
            : glitchChars[Math.floor(Math.random() * glitchChars.length)];
        })
        .join('');

      setDisplayText(glitchedText);
      step++;
    }, 50); // 50ms intervals for smooth animation
  };

  // Stop glitch animation
  const stopGlitch = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayText(text);
    setIsGlitching(false);
  };

  // Size variants - reduced sizes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-w-[60px]',
    sm: 'px-2 py-1 text-xs min-w-[80px]',
    md: 'px-3 py-1.5 text-xs min-w-[100px]',
    lg: 'px-4 py-2 text-sm min-w-[120px]'
  };

  // Theme-specific styling
  const themeClasses = currentTheme === 'retro' ? 'font-mono' : '';

  return (
    <button
      className={`
        glitch-btn inline-block cursor-pointer uppercase
        ${sizeClasses[size]} ${themeClasses} ${className}
        transition-all duration-200 ease-in-out
        rounded-xl
      `}
      style={{
        color: statusColors.base,
        backgroundColor: 'transparent',
        '--status-color': statusColors.base,
        '--status-hover': statusColors.hover,
        '--status-text': statusColors.text
      }}
      onMouseEnter={startGlitch}
      onMouseLeave={stopGlitch}
    >
      <span>
        {displayText}
      </span>
    </button>
  );
};

export default GlitchButton;