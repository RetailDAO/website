import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check for existing session on app load and set up activity tracking
  useEffect(() => {
    checkAuthStatus();
    setupActivityTracking();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('terminal_session_token');
      if (token) {
        const isValid = await authService.verifySession(token);
        if (isValid.success) {
          setIsAuthenticated(true);
          setSessionInfo(isValid.sessionInfo);
        } else {
          // Invalid session, clear it
          localStorage.removeItem('terminal_session_token');
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      localStorage.removeItem('terminal_session_token');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (password) => {
    try {
      const response = await authService.login(password);

      if (response.success) {
        localStorage.setItem('terminal_session_token', response.token);
        setIsAuthenticated(true);
        setSessionInfo(response.sessionInfo);
        setLastActivity(Date.now());

        // Set up activity tracking after successful login
        setTimeout(setupActivityTracking, 100);

        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error.message || 'Authentication failed. Please try again.'
      };
    }
  };

  // Activity tracking setup
  const setupActivityTracking = () => {
    if (!isAuthenticated) return;

    // Track user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Set up session timeout check every 30 seconds
    const sessionCheckInterval = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivity;

      // If no activity for 3 minutes, logout
      if (timeSinceActivity > 3 * 60 * 1000) {
        console.log('🔓 [Auth] Session expired due to inactivity');
        await logout();
        clearInterval(sessionCheckInterval);
      }
    }, 30000);

    // Handle window/tab close or navigation away
    const handleBeforeUnload = () => {
      // Set a flag indicating the window is closing
      localStorage.setItem('terminal_window_closed', Date.now().toString());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab/window became hidden
        localStorage.setItem('terminal_last_hidden', Date.now().toString());
      } else {
        // Tab/window became visible again
        const lastHidden = localStorage.getItem('terminal_last_hidden');
        const windowClosed = localStorage.getItem('terminal_window_closed');

        if (lastHidden || windowClosed) {
          const hiddenTime = parseInt(lastHidden || windowClosed);
          const timeSinceHidden = Date.now() - hiddenTime;

          // If hidden for more than 3 minutes, logout
          if (timeSinceHidden > 3 * 60 * 1000) {
            console.log('🔓 [Auth] Session expired - window was closed/hidden too long');
            logout();
          }

          // Clean up flags
          localStorage.removeItem('terminal_last_hidden');
          localStorage.removeItem('terminal_window_closed');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(sessionCheckInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('terminal_session_token');
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('terminal_session_token');
      localStorage.removeItem('terminal_last_hidden');
      localStorage.removeItem('terminal_window_closed');
      setIsAuthenticated(false);
      setSessionInfo(null);
    }
  };

  const value = {
    isAuthenticated,
    loading,
    sessionInfo,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};