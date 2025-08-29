import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DxyCard from '../DxyCard';
import * as useApiHook from '../../hooks/useApi';

// Mock the useApi hook
vi.mock('../../hooks/useApi');

describe('DxyCard Component', () => {
  const mockDxyData = {
    data: {
      data: {
        current: {
          price: 102.45,
          change24h: 0.15
        },
        analysis: {
          trend: 'bullish'
        },
        lastUpdated: new Date().toISOString(),
        isMockData: false
      }
    },
    loading: false,
    error: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useApiHook.useDxyAnalysis.mockReturnValue(mockDxyData);
  });

  test('should render DXY card with price', async () => {
    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('DXY (Dollar Index)')).toBeInTheDocument();
      expect(screen.getByText('102.45')).toBeInTheDocument();
    });
  });

  test('should show educational tooltip', async () => {
    const user = userEvent.setup();
    
    render(<DxyCard />);
    
    const tooltipTrigger = screen.getByText('?');
    await user.hover(tooltipTrigger);
    
    await waitFor(() => {
      expect(screen.getByText(/US Dollar Index/)).toBeInTheDocument();
    });
  });

  test('should display price change correctly', async () => {
    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('+0.15%')).toBeInTheDocument();
    });
  });

  test('should show negative price change in red', async () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      ...mockDxyData,
      data: {
        data: {
          ...mockDxyData.data.data,
          current: {
            price: 102.45,
            change24h: -0.25
          }
        }
      }
    });

    render(<DxyCard />);
    
    await waitFor(() => {
      const changeElement = screen.getByText('-0.25%');
      expect(changeElement).toHaveClass('text-red-600');
    });
  });

  test('should show correct dollar strength indicator', async () => {
    render(<DxyCard />);
    
    await waitFor(() => {
      // Price 102.45 should show moderate strength
      expect(screen.getByText('🟡 Moderate')).toBeInTheDocument();
    });
  });

  test('should show strong dollar when price is above 105', async () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      ...mockDxyData,
      data: {
        data: {
          ...mockDxyData.data.data,
          current: {
            price: 106.5,
            change24h: 0.8
          }
        }
      }
    });

    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('🔴 Strong')).toBeInTheDocument();
      expect(screen.getByText(/Strong dollar.*Risk assets.*decline/)).toBeInTheDocument();
    });
  });

  test('should show weak dollar when price is below 100', async () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      ...mockDxyData,
      data: {
        data: {
          ...mockDxyData.data.data,
          current: {
            price: 98.5,
            change24h: -1.2
          }
        }
      }
    });

    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('🟢 Weak')).toBeInTheDocument();
      expect(screen.getByText(/Weak dollar.*Risk assets.*benefit/)).toBeInTheDocument();
    });
  });

  test('should show trend analysis', async () => {
    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('📈 bullish')).toBeInTheDocument();
    });
  });

  test('should display key resistance and support levels', async () => {
    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Support: 100/)).toBeInTheDocument();
      expect(screen.getByText(/Resistance: 105/)).toBeInTheDocument();
    });
  });

  test('should show crypto impact context', async () => {
    render(<DxyCard />);
    
    await waitFor(() => {
      // Should show context for moderate dollar (102.45)
      expect(screen.getByText(/Neutral dollar strength.*Mixed crypto impact/)).toBeInTheDocument();
    });
  });

  test('should show loading state', () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      data: null,
      loading: true,
      error: null
    });

    render(<DxyCard />);
    
    expect(screen.getByText('DXY Index')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('should show error state', () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch DXY data'
    });

    render(<DxyCard />);
    
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch DXY data')).toBeInTheDocument();
  });

  test('should handle missing data gracefully', async () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      data: {
        data: {
          current: {},
          analysis: {}
        }
      },
      loading: false,
      error: null
    });

    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('Analysis pending')).toBeInTheDocument();
    });
  });

  test('should show correct threshold context for different prices', async () => {
    // Test different price ranges
    const testCases = [
      { price: 107, expected: 'Above strong resistance (105+)' },
      { price: 103.5, expected: 'In consolidation range (102-105)' },
      { price: 101, expected: 'Approaching support (100-102)' },
      { price: 98, expected: 'Below major support (<100)' }
    ];

    for (const testCase of testCases) {
      useApiHook.useDxyAnalysis.mockReturnValue({
        ...mockDxyData,
        data: {
          data: {
            ...mockDxyData.data.data,
            current: {
              price: testCase.price,
              change24h: 0.1
            }
          }
        }
      });

      const { rerender } = render(<DxyCard />);
      
      await waitFor(() => {
        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      });

      rerender(<div />); // Clear for next test
    }
  });

  test('should show mock data indicator when applicable', async () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      ...mockDxyData,
      data: {
        data: {
          ...mockDxyData.data.data,
          isMockData: true
        }
      }
    });

    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Demo Data/)).toBeInTheDocument();
    });
  });

  test('should format price with correct decimal places', async () => {
    useApiHook.useDxyAnalysis.mockReturnValue({
      ...mockDxyData,
      data: {
        data: {
          ...mockDxyData.data.data,
          current: {
            price: 102.456789,
            change24h: 0.123456
          }
        }
      }
    });

    render(<DxyCard />);
    
    await waitFor(() => {
      expect(screen.getByText('102.4568')).toBeInTheDocument();
      expect(screen.getByText('+0.1235%')).toBeInTheDocument();
    });
  });

  test('should show pulse animation indicator', () => {
    render(<DxyCard />);
    
    const pulseElement = screen.getByText('DXY (Dollar Index)')
      .closest('div')
      .querySelector('.animate-pulse');
    
    expect(pulseElement).toBeInTheDocument();
  });
});