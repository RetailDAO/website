import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './app.jsx'
import './index.css'
import { initPerformanceMonitoring } from './utils/performance.js'

// Create a client optimized for instant cache-first loading
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always show cached data instantly
      gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      retry: (failureCount, error) => {
        // Don't retry if it's a 404 or 403
        if (error?.status === 404 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Prioritize cached data
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      networkMode: 'offlineFirst', // Show cached data even when offline
    },
  },
})

// Initialize performance monitoring for Market Overview v2
initPerformanceMonitoring();

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)