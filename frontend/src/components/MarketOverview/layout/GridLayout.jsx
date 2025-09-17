// Performance-optimized grid layout for Market Overview cards
import React from 'react';

const GridLayout = React.memo(({ children, className = '' }) => {
  
  return (
    <div
      className={`
        market-overview-grid
        grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3
        gap-2 md:gap-3 lg:gap-4
        p-2 md:p-3 lg:p-4
        w-full
        ${className}
      `}
      style={{
        // Responsive height for different screen sizes
        minHeight: 'auto',
        // CSS Grid optimization for responsive layout
        gridAutoRows: 'minmax(280px, auto)', // Smaller minimum for mobile
        // Remove fixed row template for better responsiveness
        // Performance optimizations
        contain: 'layout',
        willChange: 'auto',
        overflow: 'visible' // Ensure content isn't hidden
      }}
    >
      {children}
    </div>
  );
});

GridLayout.displayName = 'GridLayout';

export default GridLayout;