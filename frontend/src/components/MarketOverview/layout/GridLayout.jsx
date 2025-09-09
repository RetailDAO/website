// Performance-optimized grid layout for Market Overview cards
import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

const GridLayout = React.memo(({ children, className = '' }) => {
  const { colors } = useTheme();
  
  return (
    <div 
      className={`
        market-overview-grid
        grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3
        gap-4 md:gap-6
        p-4 md:p-6
        ${className}
      `}
      style={{
        // Fixed minimum height prevents CLS during loading
        minHeight: '800px',
        // CSS Grid optimization for better performance
        gridAutoRows: 'min-content',
        // Performance optimizations
        contain: 'layout',
        willChange: 'auto'
      }}
    >
      {children}
    </div>
  );
});

GridLayout.displayName = 'GridLayout';

export default GridLayout;