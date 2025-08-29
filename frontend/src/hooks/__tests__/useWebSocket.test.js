import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, useCryptoPriceWebSocket, useConnectionStatus } from '../useWebSocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test('should connect to WebSocket on mount', async () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/test')
    );

    expect(result.current.connectionStatus).toBe('connecting');

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });
  });

  test('should handle WebSocket messages', async () => {
    const mockOnMessage = vi.fn();
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/test', { onMessage: mockOnMessage })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate receiving a message
    act(() => {
      const mockMessage = { data: JSON.stringify({ type: 'test', data: 'hello' }) };
      // Access the WebSocket instance and trigger message
      if (global.WebSocket.mock?.instances?.[0]) {
        global.WebSocket.mock.instances[0].onmessage(mockMessage);
      }
    });

    expect(mockOnMessage).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
  });

  test('should reconnect on connection failure', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/test', { 
        maxReconnectAttempts: 2,
        reconnectInterval: 1000 
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection loss
    act(() => {
      if (global.WebSocket.mock?.instances?.[0]) {
        global.WebSocket.mock.instances[0].onclose({ code: 1006, reason: 'Connection lost' });
      }
    });

    expect(result.current.connectionStatus).toBe('reconnecting');

    // Fast-forward timers to trigger reconnection
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected');
    });

    vi.useRealTimers();
  });

  test('should send messages when connected', async () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/test')
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const mockSend = vi.fn();
    if (global.WebSocket.mock?.instances?.[0]) {
      global.WebSocket.mock.instances[0].send = mockSend;
    }

    act(() => {
      result.current.sendMessage({ type: 'ping' });
    });

    expect(mockSend).toHaveBeenCalledWith('{"type":"ping"}');
  });

  test('should not send messages when disconnected', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/test')
    );

    // Don't wait for connection, try to send immediately
    act(() => {
      result.current.sendMessage({ type: 'ping' });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket not connected')
    );

    consoleSpy.mockRestore();
  });
});

describe('useCryptoPriceWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should handle price updates', async () => {
    const mockOnPriceUpdate = vi.fn();
    
    const { result } = renderHook(() => 
      useCryptoPriceWebSocket(mockOnPriceUpdate)
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate receiving a price update
    const priceUpdate = {
      type: 'price_update',
      symbol: 'BTCUSDT',
      price: 45000,
      change24h: 2.5,
      timestamp: new Date().toISOString()
    };

    act(() => {
      // Simulate message handling
      if (global.WebSocket.mock?.instances?.[0]) {
        const mockMessage = { data: JSON.stringify(priceUpdate) };
        global.WebSocket.mock.instances[0].onmessage(mockMessage);
      }
    });

    expect(mockOnPriceUpdate).toHaveBeenCalledWith('BTCUSDT', {
      price: 45000,
      change24h: 2.5,
      timestamp: priceUpdate.timestamp
    });

    expect(result.current.prices.BTCUSDT).toEqual({
      price: 45000,
      change24h: 2.5,
      timestamp: priceUpdate.timestamp
    });
  });

  test('should ignore non-price update messages', async () => {
    const mockOnPriceUpdate = vi.fn();
    
    const { result } = renderHook(() => 
      useCryptoPriceWebSocket(mockOnPriceUpdate)
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate receiving a non-price message
    const otherMessage = {
      type: 'connection',
      status: 'connected'
    };

    act(() => {
      if (global.WebSocket.mock?.instances?.[0]) {
        const mockMessage = { data: JSON.stringify(otherMessage) };
        global.WebSocket.mock.instances[0].onmessage(mockMessage);
      }
    });

    expect(mockOnPriceUpdate).not.toHaveBeenCalled();
  });
});

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
  });

  test('should check API health on mount', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.status.api).toBe('connected');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/health');
  });

  test('should handle API health check failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.status.api).toBe('disconnected');
    });
  });

  test('should update WebSocket status', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      result.current.updateWebSocketStatus('connected');
    });

    expect(result.current.status.websocket).toBe('connected');
    expect(result.current.status.lastUpdate).toBeInstanceOf(Date);
  });

  test('should manually check API health', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    });

    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => {
      await result.current.checkApiHealth();
    });

    expect(result.current.status.api).toBe('connected');
  });

  test('should periodically check API health', async () => {
    vi.useFakeTimers();
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    });

    renderHook(() => useConnectionStatus());

    // Clear initial call
    global.fetch.mockClear();

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/health');
    });

    vi.useRealTimers();
  });
});