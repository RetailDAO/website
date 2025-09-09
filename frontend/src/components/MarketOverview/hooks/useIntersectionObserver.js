// Performance-optimized intersection observer for lazy loading Market Overview cards
import { useRef, useEffect, useCallback } from 'react';

const useIntersectionObserver = (options = {}) => {
  const elementRef = useRef(null);
  const observerRef = useRef(null);
  
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '50px',
    onIntersect = null,
    once = false
  } = options;

  const handleIntersection = useCallback((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Performance tracking
        const cardId = entry.target.dataset.cardId;
        if (cardId) {
          performance.mark(`${cardId}-visible-start`);
          console.log(`👁️ Card visible: ${cardId}`);
        }
        
        if (onIntersect) {
          onIntersect(entries);
        }
        
        // Disconnect observer if 'once' option is true
        if (once && observerRef.current) {
          observerRef.current.unobserve(entry.target);
        }
      }
    });
  }, [onIntersect, once]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create observer with optimized settings
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      root,
      rootMargin
    });

    observerRef.current.observe(element);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, root, rootMargin]);

  return { ref: elementRef, observer: observerRef.current };
};

export default useIntersectionObserver;