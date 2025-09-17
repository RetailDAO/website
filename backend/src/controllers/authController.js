/**
 * Simple Password Authentication Controller
 *
 * Provides basic password-based access control for the crypto terminal.
 * Features:
 * - Single hardcoded password (rotatable via environment variable)
 * - Session-based authentication
 * - Simple token generation for frontend
 */

const crypto = require('crypto');
const config = require('../config/environment');

class AuthController {
  constructor() {
    // Generate a session secret for this instance
    this.sessionSecret = crypto.randomBytes(32).toString('hex');
    this.activeSessions = new Map();

    // Session TTL (3 minutes for strict security)
    this.sessionTTL = 3 * 60 * 1000;

    console.log('🔐 [Auth] Simple password authentication initialized');
    console.log(`🔑 [Auth] Current password configured: ${config.TERMINAL_PASSWORD ? 'YES' : 'NO'}`);
  }

  /**
   * Authenticate user with password
   */
  async login(req, res) {
    try {
      const { password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      console.log(`🔐 [Auth] Login attempt from ${clientIP}`);

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      // Check against configured terminal password
      const terminalPassword = config.TERMINAL_PASSWORD;

      if (!terminalPassword) {
        console.error('❌ [Auth] TERMINAL_PASSWORD not configured in environment');
        return res.status(500).json({
          success: false,
          message: 'Authentication system not properly configured'
        });
      }

      if (password === terminalPassword) {
        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + this.sessionTTL;

        // Store session
        this.activeSessions.set(sessionToken, {
          createdAt: Date.now(),
          expiresAt,
          clientIP,
          lastActivity: Date.now()
        });

        console.log(`✅ [Auth] Successful login from ${clientIP}, session: ${sessionToken.substring(0, 8)}...`);

        // Clean up expired sessions periodically
        this.cleanupExpiredSessions();

        return res.json({
          success: true,
          message: 'Authentication successful',
          token: sessionToken,
          expiresAt: new Date(expiresAt).toISOString(),
          sessionInfo: {
            ttl: this.sessionTTL,
            createdAt: new Date().toISOString()
          }
        });

      } else {
        console.log(`❌ [Auth] Failed login attempt from ${clientIP}`);

        // Add small delay to prevent brute force (not critical for simple shared password)
        await new Promise(resolve => setTimeout(resolve, 1000));

        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

    } catch (error) {
      console.error('❌ [Auth] Login error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }

  /**
   * Verify session token
   */
  async verifySession(req, res) {
    try {
      const { token } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Session token is required'
        });
      }

      const session = this.activeSessions.get(token);

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session token'
        });
      }

      if (Date.now() > session.expiresAt) {
        this.activeSessions.delete(token);
        return res.status(401).json({
          success: false,
          message: 'Session expired'
        });
      }

      // Update last activity
      session.lastActivity = Date.now();

      console.log(`✅ [Auth] Session verified for ${clientIP}, token: ${token.substring(0, 8)}...`);

      return res.json({
        success: true,
        message: 'Session valid',
        sessionInfo: {
          expiresAt: new Date(session.expiresAt).toISOString(),
          createdAt: new Date(session.createdAt).toISOString(),
          lastActivity: new Date(session.lastActivity).toISOString()
        }
      });

    } catch (error) {
      console.error('❌ [Auth] Session verification error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Session verification error'
      });
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(req, res) {
    try {
      const { token } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      if (token && this.activeSessions.has(token)) {
        this.activeSessions.delete(token);
        console.log(`🔓 [Auth] Session logged out for ${clientIP}, token: ${token.substring(0, 8)}...`);
      }

      return res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('❌ [Auth] Logout error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Logout error'
      });
    }
  }

  /**
   * Get authentication status
   */
  async getAuthStatus(req, res) {
    const activeSessions = this.activeSessions.size;
    const isConfigured = !!config.TERMINAL_PASSWORD;

    return res.json({
      success: true,
      authSystem: {
        type: 'simple_password',
        configured: isConfigured,
        activeSessions,
        sessionTTL: this.sessionTTL,
        status: isConfigured ? 'ready' : 'not_configured'
      }
    });
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [token, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [Auth] Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Middleware to protect routes
   */
  requireAuth() {
    return async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const session = this.activeSessions.get(token);

        if (!session || Date.now() > session.expiresAt) {
          if (session) this.activeSessions.delete(token);
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired session'
          });
        }

        // Update last activity
        session.lastActivity = Date.now();
        req.session = session;
        req.sessionToken = token;

        next();
      } catch (error) {
        console.error('❌ [Auth] Authorization error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Authorization error'
        });
      }
    };
  }
}

// Export singleton instance
const authController = new AuthController();

module.exports = {
  authController: {
    login: authController.login.bind(authController),
    verifySession: authController.verifySession.bind(authController),
    logout: authController.logout.bind(authController),
    getAuthStatus: authController.getAuthStatus.bind(authController),
    requireAuth: authController.requireAuth.bind(authController)
  }
};