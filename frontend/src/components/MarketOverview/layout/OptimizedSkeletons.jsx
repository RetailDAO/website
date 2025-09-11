// Performance-optimized skeleton loaders for Market Overview cards
import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

// Base skeleton with exact dimensions to prevent CLS
const SkeletonBase = React.memo(({ 
  height = "h-4", 
  width = "w-full", 
  rounded = "rounded",
  className = "",
  style = {}
}) => {
  const { colors } = useTheme();
  
  return (
    <div 
      className={`${height} ${width} ${rounded} ${colors.bg.tertiary} animate-pulse ${className}`}
      style={{
        contain: 'layout style', // Performance optimization
        ...style
      }}
    />
  );
});

// Enhanced Moving Averages Card Skeleton with cache-first messaging
export const MovingAveragesSkeleton = React.memo(() => {
  const { colors } = useTheme();
  
  return (
    <div className="h-full flex flex-col p-6" style={{ minHeight: '400px' }}>
      {/* Header with Cache Status */}
      <div className="mb-6">
        <SkeletonBase height="h-6" width="w-32" className="mb-2" />
        <div className="flex items-center space-x-2">
          <SkeletonBase height="h-4" width="w-16" />
          <span className={`text-xs font-mono ${colors.text.highlight} animate-pulse`}>
            [LOADING_CACHE...]
          </span>
        </div>
      </div>
      
      {/* Price Display */}
      <div className="mb-6">
        <SkeletonBase height="h-8" width="w-24" className="mb-1" />
        <SkeletonBase height="h-4" width="w-20" />
      </div>
      
      {/* MA Indicators */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <SkeletonBase height="h-4" width="w-16" />
          <SkeletonBase height="h-4" width="w-20" />
          <SkeletonBase height="h-4" width="w-16" />
        </div>
        <div className="flex justify-between">
          <SkeletonBase height="h-4" width="w-16" />
          <SkeletonBase height="h-4" width="w-20" />
          <SkeletonBase height="h-4" width="w-16" />
        </div>
      </div>
      
      {/* Cache-first indicator */}
      <div className={`mt-auto pt-4 text-center text-xs ${colors.text.muted} font-mono`}>
        RETRIEVING_CACHED_DATA
      </div>
    </div>
  );
});

// State of Leverage Card Skeleton  
export const LeverageSkeleton = React.memo(() => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="mb-8 text-center">
        <SkeletonBase height="h-6" width="w-32" className="mx-auto mb-2" />
      </div>
      
      {/* Traffic Light */}
      <div className="mb-6">
        <SkeletonBase height="h-16" width="w-16" rounded="rounded-full" className="mx-auto" />
      </div>
      
      {/* Status Text */}
      <div className="mb-4">
        <SkeletonBase height="h-5" width="w-48" />
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="text-center">
          <SkeletonBase height="h-4" width="w-16" className="mx-auto mb-1" />
          <SkeletonBase height="h-6" width="w-12" className="mx-auto" />
        </div>
        <div className="text-center">
          <SkeletonBase height="h-4" width="w-16" className="mx-auto mb-1" />
          <SkeletonBase height="h-6" width="w-12" className="mx-auto" />
        </div>
      </div>
    </div>
  );
});

// Large card skeleton for chart-heavy components
export const LargeCardSkeleton = React.memo(() => {
  return (
    <div className="h-full flex flex-col p-6" style={{ minHeight: '500px' }}>
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <SkeletonBase height="h-6" width="w-32" />
        <div className="flex space-x-2">
          <SkeletonBase height="h-8" width="w-12" rounded="rounded-md" />
          <SkeletonBase height="h-8" width="w-12" rounded="rounded-md" />
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="flex-1 mb-4">
        <SkeletonBase height="h-full" width="w-full" rounded="rounded-lg" style={{ minHeight: '300px' }} />
      </div>
      
      {/* Stats Row */}
      <div className="flex justify-between">
        <div>
          <SkeletonBase height="h-4" width="w-16" className="mb-1" />
          <SkeletonBase height="h-6" width="w-20" />
        </div>
        <div>
          <SkeletonBase height="h-6" width="w-24" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
});

// Futures Basis Card Skeleton
export const FuturesBasisSkeleton = React.memo(() => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="mb-8 text-center">
        <SkeletonBase height="h-6" width="w-36" className="mx-auto mb-2" />
        <SkeletonBase height="h-4" width="w-24" className="mx-auto" />
      </div>
      
      {/* Basis Value */}
      <div className="mb-6 text-center">
        <SkeletonBase height="h-8" width="w-20" className="mx-auto mb-2" />
        <SkeletonBase height="h-4" width="w-24" className="mx-auto" />
      </div>
      
      {/* Status Badge */}
      <div className="mb-6">
        <SkeletonBase height="h-10" width="w-32" rounded="rounded-lg" />
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="text-center">
          <SkeletonBase height="h-4" width="w-16" className="mx-auto mb-1" />
          <SkeletonBase height="h-6" width="w-20" className="mx-auto" />
        </div>
        <div className="text-center">
          <SkeletonBase height="h-4" width="w-16" className="mx-auto mb-1" />
          <SkeletonBase height="h-6" width="w-20" className="mx-auto" />
        </div>
      </div>
    </div>
  );
});

// Rotation Breadth Card Skeleton
export const RotationSkeleton = React.memo(() => {
  return (
    <div className="h-full flex flex-col p-6" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="mb-6">
        <SkeletonBase height="h-6" width="w-32" className="mb-2" />
        <SkeletonBase height="h-4" width="w-24" />
      </div>
      
      {/* Gauge Area */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="text-center">
          <SkeletonBase height="h-24" width="w-24" rounded="rounded-full" className="mx-auto mb-4" />
          <SkeletonBase height="h-5" width="w-20" className="mx-auto mb-1" />
          <SkeletonBase height="h-4" width="w-16" className="mx-auto" />
        </div>
      </div>
      
      {/* Top Performers */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <SkeletonBase height="h-4" width="w-12" />
            <SkeletonBase height="h-4" width="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
});

// Export all skeletons
SkeletonBase.displayName = 'SkeletonBase';
MovingAveragesSkeleton.displayName = 'MovingAveragesSkeleton';
LeverageSkeleton.displayName = 'LeverageSkeleton';
LargeCardSkeleton.displayName = 'LargeCardSkeleton';
FuturesBasisSkeleton.displayName = 'FuturesBasisSkeleton';
RotationSkeleton.displayName = 'RotationSkeleton';