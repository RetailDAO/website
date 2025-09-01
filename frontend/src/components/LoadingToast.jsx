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
        return 'border-green-500 bg-green-900/90 text-green-100';
      case 'warning':
        return 'border-yellow-500 bg-yellow-900/90 text-yellow-100';
      case 'error':
        return 'border-red-500 bg-red-900/90 text-red-100';
      default:
        return 'border-blue-500 bg-blue-900/90 text-blue-100';
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
        return '📊';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      <div className={`max-w-sm ${getTypeStyles()} rounded-lg border shadow-lg backdrop-blur-sm p-4`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-lg">{getIcon()}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-1">
              {message}
            </div>
            
            {progress > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
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
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            ✕
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