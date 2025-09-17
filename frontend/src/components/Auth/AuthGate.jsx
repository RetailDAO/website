import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// can replace this with:
// 1. A direct URL to your owl image
// 2. An imported image: import owlImage from '../assets/owl.png'
// 3. A base64 encoded version of your image
const owlImageUrl = "https://raw.githubusercontent.com/RetailDAO/website/refs/heads/main/frontend/public/discord_profile_picture.png";

const AuthGate = () => {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(password);

      if (!result.success) {
        setError(result.message || 'Invalid password');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPassword('');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-black via-gray-900 to-gray-800">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            <div className="w-1 h-1 bg-orange-400 rounded-full opacity-40"></div>
          </div>
        ))}
      </div>

      {/* Main auth card */}
      <div
        className={`
          relative max-w-md w-full mx-auto transform transition-all duration-1000 ease-out
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
          ${shake ? 'animate-shake' : ''}
        `}
      >
        <div
          className={`
            relative p-8 rounded-2xl backdrop-blur-lg border-2
            ${colors.bg.card} ${colors.border.primary}
            shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 ease-out
            hover:scale-105 hover:border-orange-400/50
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r
            before:from-orange-500/10 before:to-purple-500/10 before:opacity-0
            hover:before:opacity-100 before:transition-opacity before:duration-500
          `}
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className={`text-xs font-mono ${colors.text.muted}`}>
              AUTH_TERMINAL
            </div>
          </div>

          {/* Logo/Owl section */}
          <div className="text-center mb-8">
            <div className="relative inline-block group">
              <div
                className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden
                          border-4 border-orange-400 transition-all duration-500 ease-out
                          group-hover:border-orange-300 group-hover:shadow-lg group-hover:shadow-orange-400/30
                          group-hover:scale-110 bg-gradient-to-br from-orange-400 to-amber-500"
              >
                <img
                  src={owlImageUrl}
                  alt="DAO Owl"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to emoji if image fails
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div
                  className="hidden w-full h-full items-center justify-center text-4xl"
                  style={{ display: 'none' }}
                >
                  🦉
                </div>
              </div>

              {/* Animated rings around logo */}
              <div className="absolute inset-0 rounded-full border border-orange-400/30 animate-ping-slow"></div>
              <div className="absolute inset-2 rounded-full border border-orange-400/20 animate-ping-slow-delayed"></div>
            </div>

            <h1 className={`text-2xl font-bold ${colors.text.primary} mb-2 tracking-wider`}>
              RETAIL DAO CRYPTO TERMINAL
            </h1>
            <p className={`text-sm ${colors.text.muted} font-mono mb-1`}>
              [INSTITUTIONAL-GRADE ANALYTICS]
            </p>
            <p className={`text-xs ${colors.text.secondary} font-mono`}>
              Secure Access Required
            </p>
          </div>

          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-mono uppercase tracking-wider ${colors.text.secondary} mb-2`}
              >
                Access Code
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`
                    w-full px-4 py-3 pr-20 rounded-lg font-mono
                    ${colors.bg.secondary} ${colors.border.primary} ${colors.text.primary}
                    border-2 transition-all duration-300 ease-out
                    focus:outline-none focus:ring-2 focus:ring-orange-400/50
                    focus:border-orange-400 focus:scale-[1.02]
                    placeholder-gray-500
                  `}
                  placeholder="Enter terminal access code..."
                  disabled={isLoading}
                  autoComplete="off"
                  autoFocus
                />
                <div className="absolute inset-y-0 right-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`
                      p-1 rounded hover:bg-gray-600/50 transition-colors duration-200
                      ${colors.text.muted} hover:${colors.text.secondary}
                    `}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                  <div className={colors.text.muted}>
                    🔐
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div
                className={`
                  p-3 rounded-lg border ${colors.bg.secondary} border-red-500/50
                  text-red-400 text-sm font-mono text-center
                  animate-fade-in
                `}
              >
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className={`
                w-full py-3 px-6 rounded-lg font-mono uppercase tracking-wider
                transition-all duration-300 ease-out transform
                ${!password.trim() || isLoading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : `bg-gradient-to-r from-orange-500 to-amber-500
                     hover:from-orange-400 hover:to-amber-400
                     text-white hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30
                     active:scale-95`
                }
                focus:outline-none focus:ring-2 focus:ring-orange-400/50
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>🚀 Access Terminal</>
              )}
            </button>
          </form>

          {/* Footer info */}
          <div className="mt-8 pt-6 border-t border-gray-700/50">
            <div className={`text-center text-xs ${colors.text.muted} font-mono space-y-1`}>
              <p>🔒 Secure session-based authentication</p>
              <p>⏰ 24-hour session duration</p>
              <p className="text-orange-400">🦉 Powered by Retail DAO Core</p>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/10 to-purple-500/10 blur-xl -z-10 opacity-50"></div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        @keyframes ping-slow-delayed {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-ping-slow-delayed {
          animation: ping-slow-delayed 3s cubic-bezier(0, 0, 0.2, 1) infinite;
          animation-delay: 1s;
        }

        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AuthGate;