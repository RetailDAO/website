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
        
        // Price WebSocket doesn't need subscription - it auto-streams
        console.log('✅ Connected to price WebSocket - auto-streaming enabled');
      };

      ws.current.onmessage = (event) => {
        try {
          console.log('🔌 Raw WebSocket message:', event.data);
          const data = JSON.parse(event.data);
          console.log('🔓 Parsed WebSocket data:', data);
          setLastMessage(data);
          if (optionsRef.current.onMessage) {
            optionsRef.current.onMessage(data);
          } else {
            console.warn('⚠️ No onMessage handler configured');
          }
        } catch (parseError) {
          console.error('❌ WebSocket parse error:', parseError, 'Raw data:', event.data);
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
    console.log('📨 WebSocket message received:', data);
    if (data.type === 'price_update') {
      console.log('💰 Processing price update:', data);
      const { symbol, price, change24h, timestamp } = data;
      const priceData = { price, change24h, timestamp };
      
      setPrices(prev => ({
        ...prev,
        [symbol]: priceData
      }));
      
      if (onPriceUpdate) {
        console.log('📞 Calling onPriceUpdate callback with:', symbol, priceData);
        onPriceUpdate(symbol, priceData);
      } else {
        console.warn('⚠️ onPriceUpdate callback not provided');
      }
    } else {
      console.log('📝 Non-price message type:', data.type || 'unknown');
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

// Hook for WebSocket indicator streaming (RSI, Moving Averages)
export function useIndicatorWebSocket(onIndicatorUpdate) {
  const [indicators, setIndicators] = useState({});

  const handleMessage = useCallback((data) => {
    console.log('📊 Indicator WebSocket message:', data);
    
    if (data.type === 'indicator_update' && data.data) {
      console.log('📊 Processing indicator update:', data);
      const { symbol, data: indicatorData } = data;
      
      // Update indicators state
      setIndicators(prev => ({
        ...prev,
        [symbol]: indicatorData
      }));
      
      // Call callback if provided
      if (onIndicatorUpdate) {
        console.log('📞 Calling onIndicatorUpdate callback with:', symbol, indicatorData);
        onIndicatorUpdate(symbol, indicatorData);
      } else {
        console.warn('⚠️ onIndicatorUpdate callback not provided');
      }
    } else if (data.type === 'connection_established') {
      console.log('✅ Indicator WebSocket connection established:', data);
    } else if (data.type === 'pong') {
      console.log('🏓 Indicator WebSocket pong received');
    } else {
      console.log('📝 Non-indicator message type:', data.type || 'unknown');
    }
  }, [onIndicatorUpdate]);

  // Use Vite proxied WebSocket endpoint in development
  const wsUrl = import.meta.env.DEV 
    ? 'ws://localhost:3000/ws/indicators'  // Vite dev server with proxy
    : 'wss://website-production-8f8a.up.railway.app/ws/indicators'; // Railway production URL
    
  const wsConnection = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    maxReconnectAttempts: 3,
    reconnectInterval: 5000
  });

  return {
    ...wsConnection,
    indicators
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

// Hook for indicator streaming WebSocket with enhanced data management
export function useIndicatorStream(options = {}) {
  const [indicators, setIndicators] = useState({});
  const [streamStatus, setStreamStatus] = useState({
    connected: false,
    subscriptions: [],
    lastUpdate: null,
    health: 'unknown'
  });
  const [historicalData, setHistoricalData] = useState({});
  
  const {
    autoSubscribe = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    enableDataMerging = true,
    fallbackToAPI = true
  } = options;

  // API fallback for when WebSocket is disconnected
  const fetchIndicatorsFromAPI = useCallback(async (symbol) => {
    if (!fallbackToAPI) return null;
    
    try {
      const endpoint = symbol 
        ? `/api/v1/indicators/cached/${symbol}`
        : '/api/v1/indicators/cached';
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.warn('Failed to fetch indicators from API:', error);
    }
    return null;
  }, [fallbackToAPI]);

  // Enhanced message handler with data merging
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection_established':
        setStreamStatus(prev => ({
          ...prev,
          connected: true,
          clientId: data.clientId,
          supportedSymbols: data.supportedSymbols,
          health: 'connected'
        }));
        
        // Auto-subscribe to symbols if specified
        if (autoSubscribe && autoSubscribe.length > 0) {
          setTimeout(() => {
            autoSubscribe.forEach(symbol => {
              wsConnection.sendMessage({
                type: 'subscribe_symbol',
                symbol: symbol
              });
            });
          }, 100);
        }
        break;

      case 'indicator_update':
        const { symbol, data: indicatorData } = data;
        
        setIndicators(prev => {
          const existing = prev[symbol] || {};
          
          // Merge with existing data if enableDataMerging is true
          const mergedData = enableDataMerging ? {
            ...existing,
            ...indicatorData,
            received: new Date(),
            cached: data.cached || false,
            source: data.cached ? 'cache' : 'realtime'
          } : {
            ...indicatorData,
            received: new Date(),
            cached: data.cached || false,
            source: data.cached ? 'cache' : 'realtime'
          };

          return {
            ...prev,
            [symbol]: mergedData
          };
        });

        setStreamStatus(prev => ({
          ...prev,
          lastUpdate: new Date(),
          health: 'connected'
        }));
        break;

      case 'subscription_confirmed':
        setStreamStatus(prev => ({
          ...prev,
          subscriptions: [...new Set([...prev.subscriptions, data.symbol])]
        }));
        console.log(`✅ Subscribed to ${data.symbol} indicators`);
        break;

      case 'unsubscription_confirmed':
        setStreamStatus(prev => ({
          ...prev,
          subscriptions: prev.subscriptions.filter(s => s !== data.symbol)
        }));
        console.log(`❌ Unsubscribed from ${data.symbol} indicators`);
        break;

      case 'current_indicators':
        // Handle bulk indicator data
        if (data.data) {
          setIndicators(prev => ({
            ...prev,
            [data.symbol]: {
              ...data.data,
              received: new Date(),
              cached: true,
              source: 'cache'
            }
          }));
        }
        break;

      case 'error':
        console.error('Indicator streaming error:', data.message);
        setStreamStatus(prev => ({
          ...prev,
          health: 'error',
          lastError: data.message
        }));
        break;

      case 'pong':
        setStreamStatus(prev => ({
          ...prev,
          health: 'connected',
          lastPong: new Date()
        }));
        break;

      default:
        console.log('Unknown indicator message type:', data.type, data);
        break;
    }
  }, [autoSubscribe, enableDataMerging]);

  // Use Vite proxied WebSocket endpoint in development
  const wsUrl = import.meta.env.DEV 
    ? 'ws://localhost:3000/ws/indicators'
    : 'wss://website-production-8f8a.up.railway.app/ws/indicators';
    
  const wsConnection = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000
  });

  // Enhanced subscription management
  const subscribeToSymbol = useCallback((symbol) => {
    if (wsConnection.isConnected) {
      wsConnection.sendMessage({
        type: 'subscribe_symbol',
        symbol: symbol
      });
    } else {
      console.warn(`Cannot subscribe to ${symbol} - WebSocket not connected`);
      // Fetch from API as fallback
      fetchIndicatorsFromAPI(symbol).then(data => {
        if (data) {
          setIndicators(prev => ({
            ...prev,
            [symbol]: {
              ...data,
              received: new Date(),
              cached: true,
              source: 'api_fallback'
            }
          }));
        }
      });
    }
  }, [wsConnection, fetchIndicatorsFromAPI]);

  const unsubscribeFromSymbol = useCallback((symbol) => {
    if (wsConnection.isConnected) {
      wsConnection.sendMessage({
        type: 'unsubscribe_symbol',
        symbol: symbol
      });
    }
  }, [wsConnection]);

  const getCurrentIndicators = useCallback((symbol = null) => {
    if (wsConnection.isConnected) {
      wsConnection.sendMessage({
        type: 'get_current_indicators',
        ...(symbol && { symbol })
      });
    } else {
      // Fallback to API
      fetchIndicatorsFromAPI(symbol).then(data => {
        if (data) {
          if (symbol) {
            setIndicators(prev => ({
              ...prev,
              [symbol]: {
                ...data,
                received: new Date(),
                cached: true,
                source: 'api_fallback'
              }
            }));
          } else {
            // Handle multiple symbols from API
            Object.entries(data).forEach(([sym, indicatorData]) => {
              setIndicators(prev => ({
                ...prev,
                [sym]: {
                  ...indicatorData,
                  received: new Date(),
                  cached: true,
                  source: 'api_fallback'
                }
              }));
            });
          }
        }
      });
    }
  }, [wsConnection, fetchIndicatorsFromAPI]);

  // Health check with ping
  const pingConnection = useCallback(() => {
    if (wsConnection.isConnected) {
      wsConnection.sendMessage({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }
  }, [wsConnection]);

  // Periodic health checks
  useEffect(() => {
    const healthInterval = setInterval(() => {
      if (wsConnection.isConnected) {
        pingConnection();
      } else {
        setStreamStatus(prev => ({
          ...prev,
          health: wsConnection.connectionStatus
        }));
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(healthInterval);
  }, [wsConnection.isConnected, wsConnection.connectionStatus, pingConnection]);

  // Get indicator for specific symbol and type
  const getIndicator = useCallback((symbol, type, period = null) => {
    const symbolData = indicators[symbol];
    if (!symbolData) return null;

    switch (type) {
      case 'rsi':
        return period ? symbolData.rsi?.[period] : symbolData.rsi;
      case 'ma':
      case 'movingAverages':
        return period ? symbolData.movingAverages?.[period] : symbolData.movingAverages;
      case 'price':
        return symbolData.current || symbolData.price;
      default:
        return symbolData[type];
    }
  }, [indicators]);

  // Check if indicator data is fresh (less than 10 minutes old)
  const isDataFresh = useCallback((symbol) => {
    const symbolData = indicators[symbol];
    if (!symbolData || !symbolData.received) return false;
    
    const age = Date.now() - new Date(symbolData.received).getTime();
    return age < 10 * 60 * 1000; // 10 minutes
  }, [indicators]);

  return {
    ...wsConnection,
    indicators,
    streamStatus,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    getCurrentIndicators,
    getIndicator,
    isDataFresh,
    pingConnection,
    // Utility methods
    isHealthy: streamStatus.health === 'connected',
    hasData: Object.keys(indicators).length > 0,
    supportedSymbols: streamStatus.supportedSymbols || []
  };
}