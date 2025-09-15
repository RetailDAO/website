/**
 * Time Tooltip Component
 *
 * Displays countdown timer as an on-hover tooltip
 * Features:
 * - Shows time until next data update on hover
 * - Clean, non-intrusive design
 * - Terminal-style formatting
 * - Theme-aware styling
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const TimeTooltip = React.memo(({
  nextUpdateTime,
  children,
  position = 'bottom',
  delay = 2000 // 2 seconds delay
}) => {
  const { colors, currentTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  useEffect(() => {
    if (!nextUpdateTime) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(nextUpdateTime).getTime();
      const difference = target - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${seconds}s`);
        }

        setIsExpired(false);
      } else {
        setTimeRemaining('Refreshing...');
        setIsExpired(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextUpdateTime]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
    }
  };

  const getThemeStyles = () => {
    switch (currentTheme) {
      case 'retro':
        return {
          bg: 'bg-black',
          border: 'border-green-500',
          text: isExpired ? 'text-green-400' : 'text-green-300',
          shadow: 'shadow-lg shadow-green-500/20'
        };
      case 'accessible':
        return {
          bg: 'bg-gray-900',
          border: 'border-blue-400',
          text: isExpired ? 'text-blue-300' : 'text-gray-100',
          shadow: 'shadow-lg shadow-blue-400/20'
        };
      default:
        return {
          bg: 'bg-gray-950',
          border: 'border-gray-600',
          text: isExpired ? 'text-orange-400' : 'text-gray-300',
          shadow: 'shadow-lg shadow-gray-900/50'
        };
    }
  };

  const themeStyles = getThemeStyles();

  if (!nextUpdateTime) {
    return children;
  }

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsVisible(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  return (
    <div
      className="relative inline-block w-full h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-2 rounded-lg border text-xs font-mono
            whitespace-nowrap pointer-events-none
            transition-opacity duration-200
            ${getPositionClasses()}
            ${themeStyles.bg}
            ${themeStyles.border}
            ${themeStyles.text}
            ${themeStyles.shadow}
            ${isExpired ? 'animate-pulse' : ''}
          `}
        >
          <div className="text-xs opacity-70 mb-1">Next Update</div>
          <div className="font-semibold">
            {timeRemaining}
          </div>
          <div className="text-xs opacity-60 mt-1">
            {new Date(nextUpdateTime).toLocaleTimeString()}
          </div>

          {/* Tooltip arrow */}
          <div
            className={`
              absolute w-2 h-2 transform rotate-45
              ${themeStyles.bg}
              ${themeStyles.border}
              ${position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0' : ''}
              ${position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2 border-b-0 border-r-0' : ''}
              ${position === 'right' ? '-left-1 top-1/2 -translate-y-1/2 border-l-0 border-b-0' : ''}
              ${position === 'left' ? '-right-1 top-1/2 -translate-y-1/2 border-r-0 border-t-0' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
});

TimeTooltip.displayName = 'TimeTooltip';

export default TimeTooltip;