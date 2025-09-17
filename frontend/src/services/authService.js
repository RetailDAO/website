/**
 * Authentication Service
 * Handles API communication for terminal authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class AuthService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  /**
   * Login with password
   */
  async login(password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      return data;
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  /**
   * Verify session token
   */
  async verifySession(token) {
    try {
      const response = await fetch(`${this.baseURL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      return data; // Return data regardless of response status for proper error handling
    } catch (error) {
      console.error('Session verification error:', error);
      return { success: false, message: 'Session verification failed' };
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(token) {
    try {
      const response = await fetch(`${this.baseURL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Logout service error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }

  /**
   * Get authentication system status
   */
  async getAuthStatus() {
    try {
      const response = await fetch(`${this.baseURL}/status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Auth status error:', error);
      return { success: false, message: 'Could not get auth status' };
    }
  }

  /**
   * Get stored session token
   */
  getSessionToken() {
    return localStorage.getItem('terminal_session_token');
  }

  /**
   * Add authorization header to API requests
   */
  getAuthHeaders() {
    const token = this.getSessionToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }
}

export default new AuthService();