import React from 'react';
import { useTheme } from '../context/ThemeContext';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Here you could send error to logging service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          theme={this.props.theme}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component
const ErrorFallback = ({ error, errorInfo, resetError, theme }) => {
  const isDark = theme?.theme === 'dark';
  
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className={`max-w-md w-full text-center p-8 rounded-lg shadow-lg ${
        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            The application encountered an unexpected error
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              isDark 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Reload Page
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className={`cursor-pointer text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Error Details (Development)
            </summary>
            <div className={`mt-2 p-3 rounded text-xs font-mono whitespace-pre-wrap ${
              isDark ? 'bg-gray-900 text-red-400' : 'bg-gray-100 text-red-600'
            }`}>
              {error.toString()}
              {errorInfo?.componentStack}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Main ErrorBoundary component that uses theme context
const ErrorBoundary = ({ children, fallback }) => {
  const theme = useTheme();
  
  return (
    <ErrorBoundaryClass theme={theme}>
      {children}
    </ErrorBoundaryClass>
  );
};

// Specialized error boundary for API calls
export const ApiErrorBoundary = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

// Error boundary for specific components
export const ComponentErrorBoundary = ({ children, componentName = 'Component' }) => {
  const theme = useTheme();
  
  return (
    <ErrorBoundaryClass theme={theme}>
      {children}
    </ErrorBoundaryClass>
  );
};

export default ErrorBoundary;