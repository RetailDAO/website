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
  
  // Flexible dimensions that prevent CLS while allowing content to fit
  const sizeClasses = {
    medium: {
      gridColumn: 'span 1',
      minHeight: '320px',
      height: 'auto',
      maxHeight: '500px'
    },
    large: {
      gridColumn: 'span 2',
      minHeight: '400px', 
      height: 'auto',
      maxHeight: '600px'
    }
  };
  
  const sizeConfig = sizeClasses[size] || sizeClasses.medium;
  
  return (
    <div
      className={`
        card-container
        ${colors.bg.card}
        ${colors.border.primary}
        ${colors.shadow.card}
        border rounded-xl p-4 md:p-6
        transition-shadow duration-200
        ${colors.bg.hover}
        ${className}
      `}
      style={{
        // Flexible dimensions prevent layout shifts while allowing content fit
        gridColumn: sizeConfig.gridColumn,
        minHeight: sizeConfig.minHeight,
        height: sizeConfig.height,
        maxHeight: sizeConfig.maxHeight,
        // Enable scrolling when content overflows
        overflow: 'auto',
        // CSS containment for performance
        contain: 'layout style paint',
        // GPU acceleration for smoother animations
        willChange: 'box-shadow',
        // Ensure proper scrollbar styling
        scrollbarWidth: 'thin',
        scrollbarColor: '#fb923c #000000',
        ...style
      }}
      {...props}
    >
      <div className="h-full flex flex-col overflow-visible">
        {children}
      </div>
    </div>
  );
});

CardContainer.displayName = 'CardContainer';

export default CardContainer;