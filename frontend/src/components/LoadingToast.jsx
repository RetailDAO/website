import { useState, useEffect } from 'react';

const LoadingToast = ({ 
  isVisible, 
  message, 
  progress = 0, 
  onClose = () => {},
  duration = 5000,
  type = 'info' // 'info', 'success', 'warning', 'error'
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [dots, setDots] = useState('');

  // Terminal-style loading dots animation
  useEffect(() => {
    if (type === 'info' && progress > 0 && progress < 100) {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [type, progress]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onClose();
          setIsClosing(false);
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-400 bg-black/95 text-green-400 shadow-lg shadow-green-400/20';
      case 'warning':
        return 'border-yellow-400 bg-black/95 text-yellow-400 shadow-lg shadow-yellow-400/20';
      case 'error':
        return 'border-red-400 bg-black/95 text-red-400 shadow-lg shadow-red-400/20';
      default:
        return 'border-cyan-400 bg-black/95 text-cyan-400 shadow-lg shadow-cyan-400/20';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '⚡';
    }
  };

  const getProgressBarColor = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-400';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-400';
      default:
        return 'bg-gradient-to-r from-cyan-500 to-blue-400';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      <div className={`max-w-sm ${getTypeStyles()} rounded-md border backdrop-blur-sm p-4 font-mono`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className={`text-lg ${type === 'info' && progress > 0 && progress < 100 ? 'animate-pulse' : ''}`}>
              {getIcon()}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-1 tracking-wide">
              <span className="opacity-60">$</span> {message}{type === 'info' && progress > 0 && progress < 100 ? dots : ''}
            </div>
            
            {progress > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-2 font-mono">
                  <span className="opacity-75">[PROGRESS]</span>
                  <span className="font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-800/80 rounded-sm h-2 border border-gray-700/50">
                  <div 
                    className={`${getProgressBarColor()} h-full rounded-sm transition-all duration-700 ease-out relative overflow-hidden`}
                    style={{ width: `${progress}%` }}
                  >
                    {/* Terminal-style scanning line effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  </div>
                </div>
                {/* Terminal-style brackets around progress bar */}
                <div className="flex justify-between text-xs mt-1 opacity-50">
                  <span>[</span>
                  <span>]</span>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              setIsClosing(true);
              setTimeout(() => {
                onClose();
                setIsClosing(false);
              }, 300);
            }}
            className="flex-shrink-0 ml-2 text-gray-500 hover:text-gray-300 transition-colors text-xs"
          >
            [X]
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingProgressManager = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Provide toast functions to children through context or props
  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <LoadingToast
            key={toast.id}
            isVisible={true}
            message={toast.message}
            progress={toast.progress}
            type={toast.type}
            duration={toast.duration || 0} // 0 means manual close
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

export { LoadingToast, LoadingProgressManager };
export default LoadingToast;