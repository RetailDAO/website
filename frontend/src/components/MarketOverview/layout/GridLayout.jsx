// Performance-optimized grid layout for Market Overview cards
import React from 'react';

const GridLayout = React.memo(({ children, className = '' }) => {
  
  return (
    <div 
      className={`
        market-overview-grid
        grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3
        gap-2 md:gap-3
        p-2 md:p-3
        ${className}
      `}
      style={{
        // Optimized height for 6-card hero section fit (2 rows x 3 cols)
        minHeight: '60vh', // Accommodate 2 rows
        maxHeight: '85vh', // Allow more height for content
        // CSS Grid optimization for 6-card layout
        gridAutoRows: 'minmax(320px, auto)', // Allow cards to grow as needed
        gridTemplateRows: 'repeat(2, minmax(320px, auto))', // 2 flexible rows
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