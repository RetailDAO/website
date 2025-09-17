import './index.css'
import MarketOverviewContainer from './components/MarketOverview/MarketOverviewContainer'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthGate from './components/Auth/AuthGate'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import {
  OpportunityRadarConstruction,
  ResourcesConstruction,
  KOLCallTrackerConstruction,
  TokenomicsDashboardConstruction
} from './components/UnderConstruction/UnderConstruction'

// Create React Query client for API data management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Protected Routes Component
const ProtectedRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-orange-400 font-mono">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return (
    <Router>
      <Routes>
        {/* Main Market Overview Route */}
        <Route path="/" element={<MarketOverviewContainer />} />

        {/* Under Construction Routes */}
        <Route path="/opportunity-radar" element={<OpportunityRadarConstruction />} />
        <Route path="/resources" element={<ResourcesConstruction />} />
        <Route path="/kol-tracker" element={<KOLCallTrackerConstruction />} />
        <Route path="/tokenomics" element={<TokenomicsDashboardConstruction />} />

        {/* Catch all route - redirect to home */}
        <Route path="*" element={<MarketOverviewContainer />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ProtectedRoutes />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App