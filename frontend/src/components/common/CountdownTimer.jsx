/**
 * Countdown Timer Component
 *
 * Displays time remaining until next data refresh
 * Features:
 * - Real-time countdown
 * - Auto-updates every second
 * - Handles expired/past timestamps gracefully
 * - Terminal-style formatting
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const CountdownTimer = React.memo(({
  nextUpdateTime,
  showLabel = true,
  size = 'sm',
  variant = 'subtle',
  onExpired = null
}) => {
  const { colors } = useTheme();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

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

        // Format based on time remaining
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

        // Call expiry callback if provided
        if (onExpired && !isExpired) {
          onExpired();
        }
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextUpdateTime, onExpired, isExpired]);

  if (!nextUpdateTime) return null;

  // Size variants
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'prominent':
        return {
          container: `px-2 py-1 rounded border ${colors.border.primary} ${colors.bg.tertiary}`,
          text: isExpired ? colors.text.accent : colors.text.primary,
          label: colors.text.secondary
        };
      case 'badge':
        return {
          container: `px-1.5 py-0.5 rounded-full border ${colors.border.secondary} ${colors.bg.hover}`,
          text: isExpired ? colors.text.accent : colors.text.primary,
          label: colors.text.muted
        };
      case 'subtle':
      default:
        return {
          container: '',
          text: isExpired ? colors.text.accent : colors.text.muted,
          label: colors.text.muted
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`flex items-center space-x-1 font-mono ${styles.container}`}>
      {showLabel && (
        <span className={`${sizeClasses[size]} ${styles.label}`}>
          Next:
        </span>
      )}
      <span
        className={`${sizeClasses[size]} ${styles.text} ${isExpired ? 'animate-pulse' : ''}`}
        title={`Next update: ${new Date(nextUpdateTime).toLocaleString()}`}
      >
        {timeRemaining}
      </span>
    </div>
  );
});

/**
 * Hook for countdown timer functionality
 * Returns formatted time remaining and expiry status
 */
export const useCountdown = (nextUpdateTime) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!nextUpdateTime) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(nextUpdateTime).getTime();
      const difference = target - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        setTimeRemaining({ hours, minutes, total: difference });
        setIsExpired(false);
      } else {
        setTimeRemaining(null);
        setIsExpired(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextUpdateTime]);

  return { timeRemaining, isExpired };
};

CountdownTimer.displayName = 'CountdownTimer';

export default CountdownTimer;