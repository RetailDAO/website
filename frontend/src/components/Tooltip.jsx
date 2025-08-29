import { useState, useRef, useEffect } from 'react';

const Tooltip = ({ 
  children, 
  content, 
  title, 
  position = 'top',
  trigger = 'hover', // hover, click, focus
  delay = 500,
  maxWidth = '320px',
  educational = false,
  className = '',
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  // Calculate optimal position based on viewport
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = position;

    // Check if tooltip would go off-screen and adjust
    if (position === 'top' && triggerRect.top - tooltipRect.height < 20) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > viewport.height - 20) {
      newPosition = 'top';
    } else if (position === 'left' && triggerRect.left - tooltipRect.width < 20) {
      newPosition = 'right';
    } else if (position === 'right' && triggerRect.right + tooltipRect.width > viewport.width - 20) {
      newPosition = 'left';
    }

    setTooltipPosition(newPosition);
  };

  const showTooltip = () => {
    if (disabled) return;
    
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const toggleTooltip = () => {
    if (disabled) return;
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50';
    
    switch (tooltipPosition) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    switch (tooltipPosition) {
      case 'top':
        return 'absolute top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-l-8 border-r-8 border-t-8 border-t-gray-800';
      case 'bottom':
        return 'absolute bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-l-8 border-r-8 border-b-8 border-b-gray-800';
      case 'left':
        return 'absolute left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-t-8 border-b-8 border-l-8 border-l-gray-800';
      case 'right':
        return 'absolute right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-t-8 border-b-8 border-r-8 border-r-gray-800';
      default:
        return 'absolute top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-l-8 border-r-8 border-t-8 border-t-gray-800';
    }
  };

  const handleTriggerEvents = () => {
    const events = {};
    
    if (trigger === 'hover') {
      events.onMouseEnter = showTooltip;
      events.onMouseLeave = hideTooltip;
    } else if (trigger === 'click') {
      events.onClick = toggleTooltip;
    } else if (trigger === 'focus') {
      events.onFocus = showTooltip;
      events.onBlur = hideTooltip;
    }
    
    return events;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        {...handleTriggerEvents()}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <>
          {/* Backdrop for click-outside to close */}
          {trigger === 'click' && (
            <div
              className="fixed inset-0 z-40"
              onClick={hideTooltip}
            />
          )}
          
          {/* Tooltip Content */}
          <div
            ref={tooltipRef}
            className={getPositionClasses()}
            style={{ maxWidth }}
          >
            {/* Arrow */}
            <div className={getArrowClasses()}></div>
            
            {/* Content */}
            <div className={`
              bg-gray-800 text-white p-4 rounded-lg shadow-xl border border-gray-600
              ${educational ? 'bg-gradient-to-br from-blue-900 to-gray-800 border-blue-600' : ''}
            `}>
              {title && (
                <div className={`
                  font-semibold mb-2 text-sm
                  ${educational ? 'text-blue-300' : 'text-gray-200'}
                `}>
                  {educational && '🎓 '}{title}
                </div>
              )}
              
              <div className="text-sm leading-relaxed">
                {typeof content === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                  content
                )}
              </div>
              
              {educational && (
                <div className="mt-3 pt-2 border-t border-blue-700">
                  <div className="text-xs text-blue-200 opacity-75">
                    💡 Educational tooltip - Click for more details
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Predefined educational tooltips for crypto indicators
export const CryptoTooltips = {
  RSI: {
    title: "Relative Strength Index (RSI)",
    content: `
      <div class="space-y-2">
        <p><strong>What it measures:</strong> Market momentum and overbought/oversold conditions</p>
        <p><strong>Range:</strong> 0-100</p>
        <ul class="list-disc list-inside space-y-1 text-xs mt-2">
          <li><span class="text-red-300">70+ = Overbought</span> (potential sell signal)</li>
          <li><span class="text-green-300">30- = Oversold</span> (potential buy signal)</li>
          <li><span class="text-yellow-300">30-70 = Neutral</span> (balanced conditions)</li>
        </ul>
        <p class="text-xs mt-2 text-gray-300">
          <strong>Pro tip:</strong> RSI works best in sideways markets. In strong trends, it can stay "overbought" or "oversold" for extended periods.
        </p>
      </div>
    `,
    educational: true
  },

  MovingAverages: {
    title: "Moving Averages (MA)",
    content: `
      <div class="space-y-2">
        <p><strong>Purpose:</strong> Smooth price action to identify trends</p>
        <div class="grid grid-cols-2 gap-2 text-xs mt-2">
          <div>
            <span class="font-medium text-green-300">MA20:</span> Short-term trend
          </div>
          <div>
            <span class="font-medium text-blue-300">MA50:</span> Medium-term trend
          </div>
          <div>
            <span class="font-medium text-purple-300">MA100:</span> Long-term trend
          </div>
          <div>
            <span class="font-medium text-gray-300">MA200:</span> Major trend
          </div>
        </div>
        <p class="text-xs mt-2 text-gray-300">
          <strong>Golden Cross:</strong> When shorter MA crosses above longer MA (bullish signal)
        </p>
        <p class="text-xs text-gray-300">
          <strong>Death Cross:</strong> When shorter MA crosses below longer MA (bearish signal)
        </p>
      </div>
    `,
    educational: true
  },

  FundingRates: {
    title: "Perpetual Funding Rates",
    content: `
      <div class="space-y-2">
        <p><strong>What it shows:</strong> Market sentiment and leverage demand</p>
        <ul class="list-disc list-inside space-y-1 text-xs mt-2">
          <li><span class="text-red-300">Positive rates:</span> Longs pay shorts (bullish sentiment)</li>
          <li><span class="text-green-300">Negative rates:</span> Shorts pay longs (bearish sentiment)</li>
          <li><span class="text-yellow-300">Higher rates:</span> More speculation/leverage</li>
        </ul>
        <p class="text-xs mt-2 text-gray-300">
          <strong>Frequency:</strong> Paid every 8 hours (00:00, 08:00, 16:00 UTC)
        </p>
        <p class="text-xs text-gray-300">
          <strong>Interpretation:</strong> Extreme rates often precede price reversals due to overleveraged positions.
        </p>
      </div>
    `,
    educational: true
  },

  DXY: {
    title: "US Dollar Index (DXY)",
    content: `
      <div class="space-y-2">
        <p><strong>What it measures:</strong> USD strength vs 6 major currencies</p>
        <p><strong>Crypto relationship:</strong> Generally inverse correlation</p>
        <ul class="list-disc list-inside space-y-1 text-xs mt-2">
          <li><span class="text-red-300">DXY Rising:</span> Dollar strengthening → Crypto typically declines</li>
          <li><span class="text-green-300">DXY Falling:</span> Dollar weakening → Crypto typically benefits</li>
        </ul>
        <div class="bg-gray-700 rounded p-2 mt-2">
          <p class="text-xs font-medium">Key Levels:</p>
          <p class="text-xs"><span class="text-red-300">105+:</span> Strong dollar (crypto headwind)</p>
          <p class="text-xs"><span class="text-green-300">&lt;100:</span> Weak dollar (crypto tailwind)</p>
        </div>
      </div>
    `,
    educational: true
  },

  ETFFlows: {
    title: "Spot Bitcoin ETF Flows",
    content: `
      <div class="space-y-2">
        <p><strong>What it tracks:</strong> Daily net investments into Bitcoin ETFs</p>
        <ul class="list-disc list-inside space-y-1 text-xs mt-2">
          <li><span class="text-green-300">Inflows (+):</span> New institutional money entering Bitcoin</li>
          <li><span class="text-red-300">Outflows (-):</span> Institutional money leaving Bitcoin</li>
        </ul>
        <div class="bg-gray-700 rounded p-2 mt-2">
          <p class="text-xs font-medium">Major ETF Providers:</p>
          <div class="grid grid-cols-2 gap-1 text-xs mt-1">
            <div>IBIT (BlackRock)</div>
            <div>FBTC (Fidelity)</div>
            <div>BITB (Bitwise)</div>
            <div>ARKB (ARK)</div>
          </div>
        </div>
        <p class="text-xs mt-2 text-gray-300">
          <strong>Impact:</strong> Large flows can significantly influence Bitcoin's price direction and market sentiment.
        </p>
      </div>
    `,
    educational: true
  }
};

export default Tooltip;