import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tooltip, { CryptoTooltips } from '../Tooltip';

describe('Tooltip Component', () => {
  const mockChildren = <button>Hover me</button>;
  const mockContent = 'This is tooltip content';
  const mockTitle = 'Test Tooltip';

  test('should render children without tooltip initially', () => {
    render(
      <Tooltip content={mockContent}>
        {mockChildren}
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByText(mockContent)).not.toBeInTheDocument();
  });

  test('should show tooltip on hover', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip content={mockContent} delay={0}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    await waitFor(() => {
      expect(screen.getByText(mockContent)).toBeInTheDocument();
    });
  });

  test('should hide tooltip on unhover', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip content={mockContent} delay={0}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    await waitFor(() => {
      expect(screen.getByText(mockContent)).toBeInTheDocument();
    });

    await user.unhover(trigger);
    await waitFor(() => {
      expect(screen.queryByText(mockContent)).not.toBeInTheDocument();
    });
  });

  test('should show tooltip on click when trigger is click', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip content={mockContent} trigger="click">
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.click(trigger);
    
    expect(screen.getByText(mockContent)).toBeInTheDocument();
  });

  test('should hide tooltip when clicking outside', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <Tooltip content={mockContent} trigger="click">
          {mockChildren}
        </Tooltip>
        <div>Outside content</div>
      </div>
    );

    const trigger = screen.getByText('Hover me');
    const outside = screen.getByText('Outside content');
    
    await user.click(trigger);
    expect(screen.getByText(mockContent)).toBeInTheDocument();

    await user.click(outside);
    await waitFor(() => {
      expect(screen.queryByText(mockContent)).not.toBeInTheDocument();
    });
  });

  test('should show title when provided', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip content={mockContent} title={mockTitle} delay={0}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    await waitFor(() => {
      expect(screen.getByText(mockTitle)).toBeInTheDocument();
      expect(screen.getByText(mockContent)).toBeInTheDocument();
    });
  });

  test('should apply educational styling when educational prop is true', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip 
        content={mockContent} 
        title={mockTitle} 
        educational={true} 
        delay={0}
      >
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    await waitFor(() => {
      const title = screen.getByText(mockTitle);
      expect(title).toBeInTheDocument();
      // Check for educational indicator (🎓 emoji)
      expect(title.textContent).toContain('🎓');
    });
  });

  test('should not show tooltip when disabled', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip content={mockContent} disabled={true}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    // Wait a bit to ensure it doesn't show
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(screen.queryByText(mockContent)).not.toBeInTheDocument();
  });

  test('should handle HTML content', async () => {
    const user = userEvent.setup();
    const htmlContent = '<strong>Bold text</strong> and <em>italic text</em>';
    
    render(
      <Tooltip content={htmlContent} delay={0}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText('italic text')).toBeInTheDocument();
    });
  });

  test('should position tooltip correctly based on position prop', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <Tooltip content={mockContent} position="top" delay={0}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    await waitFor(() => {
      const tooltip = screen.getByText(mockContent).closest('div');
      expect(tooltip).toHaveClass('bottom-full');
    });

    await user.unhover(trigger);

    rerender(
      <Tooltip content={mockContent} position="bottom" delay={0}>
        {mockChildren}
      </Tooltip>
    );

    await user.hover(trigger);
    
    await waitFor(() => {
      const tooltip = screen.getByText(mockContent).closest('div');
      expect(tooltip).toHaveClass('top-full');
    });
  });

  test('should respect delay prop', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    render(
      <Tooltip content={mockContent} delay={500}>
        {mockChildren}
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    
    await user.hover(trigger);
    
    // Should not be visible immediately
    expect(screen.queryByText(mockContent)).not.toBeInTheDocument();
    
    // Advance timers to trigger delay
    vi.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(screen.getByText(mockContent)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  test('should show focus tooltip on focus trigger', async () => {
    render(
      <Tooltip content={mockContent} trigger="focus">
        <input placeholder="Focus me" />
      </Tooltip>
    );

    const input = screen.getByPlaceholderText('Focus me');
    
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByText(mockContent)).toBeInTheDocument();
    });

    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(screen.queryByText(mockContent)).not.toBeInTheDocument();
    });
  });
});

describe('CryptoTooltips', () => {
  test('should have RSI tooltip content', () => {
    expect(CryptoTooltips.RSI).toBeDefined();
    expect(CryptoTooltips.RSI.title).toBe('Relative Strength Index (RSI)');
    expect(CryptoTooltips.RSI.educational).toBe(true);
    expect(CryptoTooltips.RSI.content).toContain('overbought');
    expect(CryptoTooltips.RSI.content).toContain('oversold');
  });

  test('should have Moving Averages tooltip content', () => {
    expect(CryptoTooltips.MovingAverages).toBeDefined();
    expect(CryptoTooltips.MovingAverages.title).toBe('Moving Averages (MA)');
    expect(CryptoTooltips.MovingAverages.educational).toBe(true);
    expect(CryptoTooltips.MovingAverages.content).toContain('Golden Cross');
    expect(CryptoTooltips.MovingAverages.content).toContain('Death Cross');
  });

  test('should have Funding Rates tooltip content', () => {
    expect(CryptoTooltips.FundingRates).toBeDefined();
    expect(CryptoTooltips.FundingRates.title).toBe('Perpetual Funding Rates');
    expect(CryptoTooltips.FundingRates.educational).toBe(true);
    expect(CryptoTooltips.FundingRates.content).toContain('8 hours');
    expect(CryptoTooltips.FundingRates.content).toContain('sentiment');
  });

  test('should have DXY tooltip content', () => {
    expect(CryptoTooltips.DXY).toBeDefined();
    expect(CryptoTooltips.DXY.title).toBe('US Dollar Index (DXY)');
    expect(CryptoTooltips.DXY.educational).toBe(true);
    expect(CryptoTooltips.DXY.content).toContain('inverse correlation');
    expect(CryptoTooltips.DXY.content).toContain('105+');
    expect(CryptoTooltips.DXY.content).toContain('<100');
  });

  test('should have ETF Flows tooltip content', () => {
    expect(CryptoTooltips.ETFFlows).toBeDefined();
    expect(CryptoTooltips.ETFFlows.title).toBe('Spot Bitcoin ETF Flows');
    expect(CryptoTooltips.ETFFlows.educational).toBe(true);
    expect(CryptoTooltips.ETFFlows.content).toContain('BlackRock');
    expect(CryptoTooltips.ETFFlows.content).toContain('IBIT');
    expect(CryptoTooltips.ETFFlows.content).toContain('institutional');
  });

  test('should render RSI tooltip in component', async () => {
    const user = userEvent.setup();
    
    render(
      <Tooltip
        title={CryptoTooltips.RSI.title}
        content={CryptoTooltips.RSI.content}
        educational={true}
        delay={0}
      >
        <div>RSI Indicator</div>
      </Tooltip>
    );

    const trigger = screen.getByText('RSI Indicator');
    
    await user.hover(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('🎓 Relative Strength Index (RSI)')).toBeInTheDocument();
      expect(screen.getByText(/70\+ = Overbought/)).toBeInTheDocument();
    });
  });
});