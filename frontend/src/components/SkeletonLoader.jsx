import { useTheme } from '../context/ThemeContext';

const SkeletonLoader = ({ 
  height = "h-4", 
  width = "w-full", 
  rounded = "rounded",
  className = "",
  animated = true 
}) => {
  const { colors } = useTheme();
  
  return (
    <div 
      className={`${height} ${width} ${rounded} ${colors.bg.tertiary} ${
        animated ? 'animate-pulse' : ''
      } ${className}`}
    />
  );
};

const ChartSkeleton = ({ height = 300 }) => {
  const { colors } = useTheme();
  
  return (
    <div className={`w-full bg-transparent border ${colors.border.primary} rounded-lg p-4`} style={{ height }}>
      <div className="flex flex-col h-full">
        {/* Chart Title Skeleton */}
        <div className="mb-4">
          <SkeletonLoader height="h-6" width="w-48" className="mb-2" />
          <SkeletonLoader height="h-3" width="w-32" />
        </div>
        
        {/* Chart Area Skeleton */}
        <div className="flex-1 flex items-end space-x-2 mb-4">
          {/* Simulate chart bars/lines */}
          {[...Array(12)].map((_, i) => (
            <SkeletonLoader 
              key={i}
              height={`h-${Math.floor(Math.random() * 20) + 8}`}
              width="w-full"
              rounded="rounded-t"
              className="flex-1"
            />
          ))}
        </div>
        
        {/* X-axis skeleton */}
        <div className="flex justify-between">
          {[...Array(5)].map((_, i) => (
            <SkeletonLoader key={i} height="h-3" width="w-12" />
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border`}>
      <div className="space-y-3">
        <SkeletonLoader height="h-5" width="w-3/4" />
        <SkeletonLoader height="h-8" width="w-1/2" />
        <SkeletonLoader height="h-3" width="w-full" />
        <div className="flex space-x-2">
          <SkeletonLoader height="h-3" width="w-16" />
          <SkeletonLoader height="h-3" width="w-20" />
        </div>
      </div>
    </div>
  );
};

const ETFFlowsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <div className={`lg:col-span-2 ${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader height="h-6" width="w-48" />
        <SkeletonLoader height="h-6" width="w-6" rounded="rounded-full" />
      </div>
      
      {/* Chart */}
      <ChartSkeleton height={300} />
      
      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`text-center p-3 ${colors.bg.tertiary} rounded`}>
          <SkeletonLoader height="h-4" width="w-20" className="mx-auto mb-2" />
          <SkeletonLoader height="h-6" width="w-16" className="mx-auto" />
        </div>
        <div className={`text-center p-3 ${colors.bg.tertiary} rounded`}>
          <SkeletonLoader height="h-4" width="w-24" className="mx-auto mb-2" />
          <SkeletonLoader height="h-6" width="w-20" className="mx-auto" />
        </div>
      </div>
      
      {/* Loading message */}
      <div className="mt-4 text-center">
        <div className={`text-sm ${colors.text.muted} flex items-center justify-center space-x-2`}>
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Fetching ETF flow data...</span>
        </div>
      </div>
    </div>
  );
};

const ProgressiveLoader = ({ 
  isLoading, 
  hasData, 
  children, 
  skeleton
}) => {
  const { colors } = useTheme();
  
  if (isLoading && !hasData) {
    return skeleton;
  }
  
  return (
    <div className="relative">
      {children}
      {isLoading && hasData && (
        <div className={`absolute top-2 right-2 ${colors.bg.tertiary} rounded-full px-2 py-1 text-xs ${colors.text.muted} flex items-center space-x-1`}>
          <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
          <span>Updating...</span>
        </div>
      )}
    </div>
  );
};

export { 
  SkeletonLoader, 
  ChartSkeleton, 
  MetricCardSkeleton, 
  ETFFlowsSkeleton, 
  ProgressiveLoader 
};
export default SkeletonLoader;