import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const optionsRef = useRef(options);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000; // Increased to 3 seconds
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options.onMessage, options.autoConnect, options.maxReconnectAttempts, options.reconnectInterval]);

  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
      console.log('⚠️ WebSocket already connecting, skipping duplicate attempt');
      return;
    }

    // Close existing connection if any
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      try {
        ws.current.close();
      } catch (error) {
        // Handle InvalidAccessError when trying to close an already closing/closed connection
        if (error.name !== 'InvalidAccessError') {
          console.error('❌ WebSocket close error during connect:', error);
        }
      }
    }

    try {
      setConnectionStatus('connecting');
      setError(null);
      
      console.log(`🔌 Connecting to WebSocket: ${url}`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0;
        console.log('✅ WebSocket connected successfully');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (optionsRef.current.onMessage) {
            optionsRef.current.onMessage(data);
          }
        } catch (parseError) {
          console.error('❌ WebSocket parse error:', parseError);
          setError('Message parsing error');
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log(`❌ WebSocket disconnected: ${event.code} - ${event.reason || 'No reason provided'}`);
        
        // Don't reconnect if:
        // 1. Normal closure (code 1000)
        // 2. Component is unmounting (code 1001) 
        // 3. Max attempts reached
        // 4. Already have a reconnect timeout pending
        if (event.code === 1000 || event.code === 1001) {
          setConnectionStatus('disconnected');
          return;
        }

        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionStatus('failed');
          setError(`Connection failed after ${maxReconnectAttempts} attempts`);
          return;
        }

        if (reconnectTimeout.current) {
          console.log('⚠️ Reconnect already scheduled, skipping');
          return;
        }

        // Schedule reconnection with exponential backoff
        const delay = Math.min(
          reconnectInterval * Math.pow(2, reconnectAttempts.current),
          30000 // Cap at 30 seconds
        );
        
        reconnectAttempts.current++;
        setConnectionStatus('reconnecting');
        
        console.log(`🔄 Scheduling reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
        
        reconnectTimeout.current = setTimeout(() => {
          reconnectTimeout.current = null;
          if (ws.current?.readyState !== WebSocket.OPEN) {
            connect();
          }
        }, delay);
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('error');
      };

    } catch (connectError) {
      console.error('❌ WebSocket connection failed:', connectError);
      setError(connectError.message);
      setConnectionStatus('failed');
    }
  }, [url, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    
    // Clear any pending reconnect attempts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      try {
        // Use code 1001 to indicate going away (component unmounting)
        ws.current.close(1001, 'Component unmounting');
      } catch (error) {
        // Handle InvalidAccessError when trying to close an already closing/closed connection
        if (error.name !== 'InvalidAccessError') {
          console.error('❌ WebSocket close error:', error);
        }
      }
      ws.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setError(null);
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, []);

  const connectionInitialized = useRef(false);
  
  useEffect(() => {
    if (optionsRef.current.autoConnect !== false && !connectionInitialized.current) {
      connectionInitialized.current = true;
      connect();
    }

    return () => {
      connectionInitialized.current = false;
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage
  };
}

// Specific hook for crypto price WebSocket
export function useCryptoPriceWebSocket(onPriceUpdate) {
  const [prices, setPrices] = useState({});
  
  const handleMessage = useCallback((data) => {
    if (data.type === 'price_update') {
      const { symbol, price, change24h, timestamp } = data;
      const priceData = { price, change24h, timestamp };
      
      setPrices(prev => ({
        ...prev,
        [symbol]: priceData
      }));
      
      if (onPriceUpdate) {
        onPriceUpdate(symbol, priceData);
      }
    }
  }, [onPriceUpdate]);

  // Use Vite proxied WebSocket endpoint in development
  const wsUrl = import.meta.env.DEV 
    ? 'ws://localhost:3000/ws/prices'  // Vite dev server with proxy
    : 'wss://website-production-8f8a.up.railway.app/ws/prices'; // Railway production URL
    
  const wsConnection = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    maxReconnectAttempts: 3,
    reconnectInterval: 5000
  });

  return {
    ...wsConnection,
    prices
  };
}

// Hook for connection status monitoring
export function useConnectionStatus() {
  const [status, setStatus] = useState({
    api: 'unknown',
    websocket: 'unknown',
    lastUpdate: null
  });

  const checkApiHealth = useCallback(async () => {
    try {
      const response = await fetch('/health'); // Use direct path, Vite will proxy to backend
      if (response.ok) {
        setStatus(prev => ({
          ...prev,
          api: 'connected',
          lastUpdate: new Date()
        }));
      } else {
        setStatus(prev => ({ ...prev, api: 'degraded' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, api: 'disconnected' }));
    }
  }, []);

  const updateWebSocketStatus = useCallback((wsStatus) => {
    setStatus(prev => ({
      ...prev,
      websocket: wsStatus,
      lastUpdate: new Date()
    }));
  }, []);

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkApiHealth]);

  return {
    status,
    updateWebSocketStatus,
    checkApiHealth
  };
}