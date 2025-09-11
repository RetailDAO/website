import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket hook for connection status monitoring
export const useConnectionStatus = () => {
  const [status, setStatus] = useState({
    api: 'unknown',
    websocket: 'disconnected',
    lastUpdate: null
  });

  const checkApiHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/market-overview/health');
      if (response.ok) {
        setStatus(prev => ({
          ...prev,
          api: 'connected',
          lastUpdate: new Date().toISOString()
        }));
      } else {
        setStatus(prev => ({ ...prev, api: 'disconnected' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, api: 'disconnected' }));
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkApiHealth]);

  return { status, checkApiHealth };
};

// WebSocket hook for indicator streaming
export const useIndicatorStream = ({ autoSubscribe = [], enableDataMerging = true }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [streamStatus, setStreamStatus] = useState('disconnected');
  const [hasData, setHasData] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);

  // Basic implementation for compatibility
  useEffect(() => {
    // Simulate connection status
    setStreamStatus('connected');
    setIsConnected(true);
    setIsHealthy(true);
    setHasData(autoSubscribe.length > 0);
  }, [autoSubscribe.length]);

  return {
    isConnected,
    streamStatus,
    hasData,
    isHealthy
  };
};

// WebSocket hook for live price streaming (NEW - for crypto price card)
export const usePriceWebSocket = () => {
  const [prices, setPrices] = useState({
    BTC: { price: null, change24h: null, volume24h: null, lastUpdate: null },
    ETH: { price: null, change24h: null, volume24h: null, lastUpdate: null },
    SOL: { price: null, change24h: null, volume24h: null, lastUpdate: null }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    try {
      // Use environment variable for WebSocket URL, fallback to current host
      const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL;
      const wsUrl = wsBaseUrl 
        ? `${wsBaseUrl}/ws/prices`
        : window.location.protocol === 'https:' 
          ? `wss://${window.location.host}/ws/prices`
          : `ws://${window.location.host}/ws/prices`;
      console.log('🔌 Connecting to price WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Price WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Subscribe to price updates
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'price_update') {
            const symbol = data.symbol;
            const crypto = symbol.replace('USDT', '');
            
            setPrices(prev => ({
              ...prev,
              [crypto]: {
                price: data.price,
                change24h: data.change24h,
                volume24h: data.volume24h,
                lastUpdate: new Date().toISOString()
              }
            }));
            
            console.log(`📈 Price update: ${crypto} = $${data.price}`);
          }
        } catch (error) {
          console.error('❌ Error parsing price message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('📡 Price WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Price WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Failed to connect to price WebSocket:', error);
      setConnectionStatus('error');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    prices,
    isConnected,
    connectionStatus
  };
};