// Performance-optimized card container with CLS prevention
import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

const CardContainer = React.memo(({ 
  children, 
  size = 'medium', 
  className = '',
  style = {},
  ...props 
}) => {
  const { colors } = useTheme();
  
  // Fixed dimensions to prevent Cumulative Layout Shift
  const sizeClasses = {
    medium: {
      gridColumn: 'span 1',
      minHeight: '400px',
      height: '400px'
    },
    large: {
      gridColumn: 'span 2',
      minHeight: '500px', 
      height: '500px'
    }
  };
  
  const sizeConfig = sizeClasses[size] || sizeClasses.medium;
  
  return (
    <div
      className={`
        ${colors.bg.card}
        ${colors.border.primary}
        ${colors.shadow.card}
        border rounded-xl p-6
        transition-shadow duration-200
        ${colors.bg.hover}
        ${className}
      `}
      style={{
        // Fixed dimensions prevent layout shifts
        gridColumn: sizeConfig.gridColumn,
        minHeight: sizeConfig.minHeight,
        height: sizeConfig.height,
        // CSS containment for performance
        contain: 'layout style paint',
        // GPU acceleration for smoother animations
        willChange: 'box-shadow',
        ...style
      }}
      {...props}
    >
      <div className="h-full flex flex-col">
        {children}
      </div>
    </div>
  );
});

CardContainer.displayName = 'CardContainer';

export default CardContainer;