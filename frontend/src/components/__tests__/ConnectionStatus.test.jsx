import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConnectionStatus from '../ConnectionStatus';
import * as useApiHook from '../../hooks/useApi';
import * as useWebSocketHook from '../../hooks/useWebSocket';

// Mock the hooks
vi.mock('../../hooks/useApi');
vi.mock('../../hooks/useWebSocket');

describe('ConnectionStatus Component', () => {
  const mockHealthCheckData = {
    data: {
      status: 'healthy',
      uptime: 3600,
      timestamp: new Date().toISOString()
    },
    loading: false,
    error: null
  };

  const mockConnectionStatus = {
    status: {
      api: 'connected',
      websocket: 'connected',
      lastUpdate: new Date()
    },
    checkApiHealth: vi.fn(),
    updateWebSocketStatus: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    useApiHook.useHealthCheck.mockReturnValue(mockHealthCheckData);
    useWebSocketHook.useConnectionStatus.mockReturnValue(mockConnectionStatus);
  });

  test('should render connection status button', () => {
    render(<ConnectionStatus websocketStatus="connected" />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTitle('Click to view connection details')).toBeInTheDocument();
  });

  test('should show "Limited" when WebSocket is disconnected', () => {
    render(<ConnectionStatus websocketStatus="disconnected" />);
    
    expect(screen.getByText('Limited')).toBeInTheDocument();
  });

  test('should show "Limited" when API is disconnected', () => {
    useApiHook.useHealthCheck.mockReturnValue({
      ...mockHealthCheckData,
      error: 'Connection failed'
    });

    render(<ConnectionStatus websocketStatus="connected" />);
    
    expect(screen.getByText('Limited')).toBeInTheDocument();
  });

  test('should expand status panel on click', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    
    await user.click(button);
    
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
    expect(screen.getByText('REST API')).toBeInTheDocument();
    expect(screen.getByText('WebSocket')).toBeInTheDocument();
  });

  test('should close status panel when clicking X', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
    
    const closeButton = screen.getByText('✕');
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Connection Status')).not.toBeInTheDocument();
    });
  });

  test('should show correct API status indicators', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('✅ Connected')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  test('should show loading state for API', async () => {
    const user = userEvent.setup();
    
    useApiHook.useHealthCheck.mockReturnValue({
      data: null,
      loading: true,
      error: null
    });

    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('🔄 Connecting...')).toBeInTheDocument();
  });

  test('should show error state for API', async () => {
    const user = userEvent.setup();
    
    useApiHook.useHealthCheck.mockReturnValue({
      data: null,
      loading: false,
      error: 'Network error'
    });

    render(<ConnectionStatus websocketStatus="disconnected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('❌ Disconnected')).toBeInTheDocument();
  });

  test('should show WebSocket status correctly', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connecting" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('🔄 Connecting...')).toBeInTheDocument();
    expect(screen.getByText('Real-time updates')).toBeInTheDocument();
  });

  test('should show reconnecting status with fallback message', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="failed" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('❌ Failed')).toBeInTheDocument();
    expect(screen.getByText('Fallback: Polling mode')).toBeInTheDocument();
  });

  test('should display performance metrics', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('Performance Impact')).toBeInTheDocument();
    expect(screen.getByText('~40/hr')).toBeInTheDocument(); // API calls with WebSocket
    expect(screen.getByText('<100ms')).toBeInTheDocument(); // Latency with WebSocket
  });

  test('should show higher API calls when WebSocket is disconnected', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="disconnected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('~120/hr')).toBeInTheDocument(); // Higher API calls without WebSocket
    expect(screen.getByText('~30s')).toBeInTheDocument(); // Higher latency with polling
  });

  test('should show uptime when available', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('60m 0s')).toBeInTheDocument(); // 3600 seconds = 60 minutes
  });

  test('should show update mode correctly', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('Real-time')).toBeInTheDocument();
  });

  test('should show polling mode when WebSocket disconnected', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="disconnected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('Polling (30s)')).toBeInTheDocument();
  });

  test('should call checkApiHealth when test connection is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    const testButton = screen.getByText('Test Connection');
    await user.click(testButton);
    
    expect(mockConnectionStatus.checkApiHealth).toHaveBeenCalled();
  });

  test('should show troubleshooting when connections are not healthy', async () => {
    const user = userEvent.setup();
    
    useApiHook.useHealthCheck.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to connect'
    });

    render(<ConnectionStatus websocketStatus="failed" />);
    
    const button = screen.getByTitle('Click to view connection details');
    await user.click(button);
    
    expect(screen.getByText('⚠️ Connection Issues')).toBeInTheDocument();
    expect(screen.getByText(/Backend API unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/WebSocket connection failed/)).toBeInTheDocument();
  });

  test('should show green pulse when both connections are healthy', () => {
    render(<ConnectionStatus websocketStatus="connected" />);
    
    const statusLight = screen.getByTitle('Click to view connection details').querySelector('div');
    expect(statusLight).toHaveClass('bg-green-500');
    expect(statusLight).toHaveClass('animate-pulse');
  });

  test('should show yellow pulse when only one connection is healthy', () => {
    render(<ConnectionStatus websocketStatus="disconnected" />);
    
    const statusLight = screen.getByTitle('Click to view connection details').querySelector('div');
    expect(statusLight).toHaveClass('bg-yellow-500');
    expect(statusLight).toHaveClass('animate-pulse');
  });

  test('should show red light when both connections are unhealthy', () => {
    useApiHook.useHealthCheck.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed'
    });

    render(<ConnectionStatus websocketStatus="failed" />);
    
    const statusLight = screen.getByTitle('Click to view connection details').querySelector('div');
    expect(statusLight).toHaveClass('bg-red-500');
  });
});