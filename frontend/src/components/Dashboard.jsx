import { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import mockDataService from '../services/mockDataService';
import apiService from '../services/api';
import { LiveRSIDisplay } from './RSIGauge';
import { useCryptoPriceWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../context/ThemeContext';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Tooltip, { CryptoTooltips } from './Tooltip';
import { ETFFlowsSkeleton, ProgressiveLoader } from './SkeletonLoader';
import { 
  updatePriceHistory, 
  calculateRealtimeIndicators, 
  getCurrentRSIValues,
  getCurrentMAValues 
} from '../utils/calculations'; 

// Custom RetailDAO Loading Animation Component
const RetailDAOLoader = ({ size = 100, message = "Loading market data..." }) => {
  const { colors } = useTheme();
  
  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-8">
      {/* Discord Profile Picture with Animations */}
      <div className="relative">
        {/* Outer glow ring - pulse animation */}
        <div className={`absolute inset-0 w-${Math.floor(size/4)} h-${Math.floor(size/4)} rounded-full bg-gradient-to-r from-[#fbc318] via-purple-500 to-blue-500 opacity-30 animate-pulse blur-sm`}
             style={{ 
               width: `${size + 40}px`, 
               height: `${size + 40}px`,
               left: '-20px',
               top: '-20px'
             }}>
        </div>
        
        {/* Middle ring - slower spin */}
        <div className={`absolute inset-0 w-${Math.floor(size/4)} h-${Math.floor(size/4)} rounded-full border-2 border-[#fbc318] opacity-60 animate-spin`}
             style={{ 
               width: `${size + 20}px`, 
               height: `${size + 20}px`,
               left: '-10px',
               top: '-10px',
               animationDuration: '4s'
             }}>
        </div>
        
        {/* Discord Profile Picture - main spin */}
        <div className="relative animate-spin" style={{ animationDuration: '3s' }}>
          <img 
            src="/discord_profile_picture.png" 
            alt="RetailDAO Loading" 
            className="rounded-full shadow-2xl border-4 border-white/20 backdrop-blur-sm"
            style={{ 
              width: `${size}px`, 
              height: `${size}px`
            }}
          />
        </div>
        
        {/* Inner sparkle effect */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-75"
             style={{ 
               background: 'radial-gradient(circle, rgba(251, 195, 24, 0.1) 0%, transparent 70%)',
               animationDuration: '2s'
             }}>
        </div>
      </div>
      
      {/* Loading Text and Progress */}
      <div className="flex flex-col items-center space-y-4">
        {/* Main loading message */}
        <div className={`text-2xl font-bold ${colors.text.primary} animate-pulse text-center`}>
          {message}
        </div>
        
        {/* Animated dots */}
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 ${colors.bg.tertiary} rounded-full animate-bounce`}
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            ></div>
          ))}
        </div>
        
        {/* Status Text */}
        <div className={`${colors.text.muted} text-sm animate-pulse text-center max-w-sm`}>
          <span className="inline-block animate-pulse">🚀</span>
          <span className="ml-2">Initializing RetailDAO Terminal</span>
        </div>
        
        {/* Subtle progress indicator */}
        <div className={`w-48 h-1 ${colors.bg.tertiary} rounded-full overflow-hidden`}>
          <div className="h-full bg-gradient-to-r from-[#fbc318] via-purple-500 to-blue-500 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};


const CryptoDashboard = () => {
  const { isDark: darkMode, colors } = useTheme();
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rsiScenario, setRsiScenario] = useState('normal');
  const [useRealAPI, setUseRealAPI] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Price history for real-time calculations
  const [priceHistory, setPriceHistory] = useState({
    bitcoin: [],
    ethereum: [],
    solana: []
  });
  
  // Real-time calculated indicators
  const [calculatedIndicators, setCalculatedIndicators] = useState({});
  
  const [dataUpdated, setDataUpdated] = useState({
    prices: false,
    btc: false,
    dxy: false,
    etf: false,
    rsi: false,
    funding: false
  });
  

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // WebSocket integration for real-time price updates
  const handlePriceUpdate = useCallback((symbol, priceData) => {
    console.log('🔄 WebSocket price update received:', symbol, priceData);
    
    let symbolKey;
    if (symbol.toLowerCase() === 'btcusdt') {
      symbolKey = 'bitcoin';
    } else if (symbol.toLowerCase() === 'ethusdt') {
      symbolKey = 'ethereum';
    } else if (symbol.toLowerCase() === 'solusdt') {
      symbolKey = 'solana';
    } else {
      console.warn('🚫 Unknown WebSocket symbol:', symbol);
      return;
    }

    // Update price history for client-side calculations
    setPriceHistory(prev => {
      const updated = {
        ...prev,
        [symbolKey]: updatePriceHistory(prev[symbolKey], {
          price: priceData.price,
          timestamp: priceData.timestamp || new Date()
        })
      };

      // Calculate real-time indicators if we have enough data
      if (updated[symbolKey].length >= 14) {
        const indicators = calculateRealtimeIndicators(updated[symbolKey]);
        setCalculatedIndicators(prevIndicators => ({
          ...prevIndicators,
          [symbolKey]: indicators
        }));
        console.log(`📊 Updated indicators for ${symbolKey}:`, indicators);
      }

      return updated;
    });

    // Update market data with new price
    setMarketData(prevData => {
      if (!prevData) return prevData;
      
      console.log(`📈 Updating ${symbolKey} price:`, priceData.price);
      return {
        ...prevData,
        [symbolKey]: {
          ...prevData[symbolKey],
          currentPrice: priceData.price,
          priceChange24h: priceData.change24h,
          lastUpdated: priceData.timestamp,
          source: 'WebSocket Live'
        }
      };
    });

    // Trigger visual update animation
    setDataUpdated(prev => ({ ...prev, prices: true }));
    setTimeout(() => setDataUpdated(prev => ({ ...prev, prices: false })), 2000);
  }, []);

  const { connectionStatus } = useCryptoPriceWebSocket(handlePriceUpdate);

  // Progressive data loading function (defined first to avoid reference errors)
  const fetchProgressiveData = useCallback(async () => {
    try {
      console.log('🚀 Starting progressive data loading over mock data...');

      // Step 1: Fetch multi-crypto data first (BTC, ETH, SOL prices and analysis)
      console.log('📈 Fetching live multi-crypto data...');
      
      const multiCryptoData = await apiService.getMultiCryptoAnalysis();
      console.log('🔍 Multi-crypto API response:', multiCryptoData);
      if (multiCryptoData && multiCryptoData.success && multiCryptoData.data) {
        // Update each crypto's data
        Object.entries(multiCryptoData.data).forEach(([symbol, data]) => {
          if (data && typeof data === 'object' && 'currentPrice' in data) {
            const cryptoKey = symbol.toLowerCase() === 'btc' ? 'bitcoin' : 
                            symbol.toLowerCase() === 'eth' ? 'ethereum' : 
                            symbol.toLowerCase() === 'sol' ? 'solana' : symbol.toLowerCase();
            
            console.log(`🔄 Updating ${cryptoKey} with price:`, data.currentPrice);
            setMarketData(prev => {
              const updated = {
                ...prev,
                [cryptoKey]: { 
                  ...prev[cryptoKey], 
                  currentPrice: data.currentPrice,
                  priceChangePercent24h: data.priceChangePercent24h,
                  volume24h: data.volume24h,
                  marketCap: data.marketCap,
                  sparkline7d: data.sparkline7d
                }
              };
              console.log(`✅ Updated ${cryptoKey} state:`, updated[cryptoKey]);
              return updated;
            });
          }
        });
        // Trigger pulsing animation for price cards
        setDataUpdated(prev => ({ ...prev, prices: true }));
        setTimeout(() => setDataUpdated(prev => ({ ...prev, prices: false })), 2000);
        console.log('✅ Live multi-crypto data loaded and updated');
      } else {
        console.warn('⚠️ Multi-crypto data failed or invalid format:', multiCryptoData);
      }

      // Step 2: Fetch BTC analysis (medium speed)
      console.log('📊 Fetching BTC analysis...');
      
      try {
        const btcAnalysis = await apiService.getBTCAnalysis();
        if (btcAnalysis) {
          setMarketData(prev => ({
            ...prev,
            bitcoin: { ...prev?.bitcoin, ...btcAnalysis }
          }));
          // Trigger pulsing animation for BTC chart
          setDataUpdated(prev => ({ ...prev, btc: true }));
          setTimeout(() => setDataUpdated(prev => ({ ...prev, btc: false })), 2000);
          console.log('✅ BTC analysis loaded and updated');
        }
      } catch (error) {
        console.warn('⚠️ BTC analysis failed, keeping mock data:', error);
      }

      // Step 3: Fetch RSI and DXY data (parallel)
      console.log('📈 Fetching RSI and DXY data...');
      
      const [rsiData, dxyData] = await Promise.allSettled([
        apiService.getRSI('BTC'),
        apiService.getDXYAnalysis()
      ]);

      if (rsiData.status === 'fulfilled') {
        setMarketData(prev => ({
          ...prev,
          rsi: rsiData.value
        }));
        // Trigger pulsing animation for RSI cards
        setDataUpdated(prev => ({ ...prev, rsi: true }));
        setTimeout(() => setDataUpdated(prev => ({ ...prev, rsi: false })), 2000);
        console.log('✅ RSI data loaded and updated');
      }

      if (dxyData.status === 'fulfilled') {
        console.log('🔍 DXY API response:', dxyData.value);
        // Extract data from API response structure
        const dxyProcessed = dxyData.value?.success && dxyData.value?.data ? dxyData.value.data : dxyData.value;
        console.log('🔍 DXY processed data:', dxyProcessed);
        
        setMarketData(prev => ({
          ...prev,
          dxy: dxyProcessed
        }));
        // Trigger pulsing animation for DXY chart
        setDataUpdated(prev => ({ ...prev, dxy: true }));
        setTimeout(() => setDataUpdated(prev => ({ ...prev, dxy: false })), 2000);
        console.log('✅ DXY data loaded and updated');
      } else {
        console.warn('⚠️ DXY data failed:', dxyData.reason);
      }

      // Step 4: Fetch funding rates (medium speed)
      console.log('💰 Fetching funding rates...');
      
      try {
        const fundingData = await apiService.getFundingRates();
        if (fundingData && fundingData.success && fundingData.data?.structured) {
          setMarketData(prev => ({
            ...prev,
            fundingRates: fundingData.data.structured
          }));
          // Trigger pulsing animation for funding rates card
          setDataUpdated(prev => ({ ...prev, funding: true }));
          setTimeout(() => setDataUpdated(prev => ({ ...prev, funding: false })), 2000);
          console.log('✅ Funding rates loaded and updated');
        }
      } catch (error) {
        console.warn('⚠️ Funding rates failed, keeping mock data:', error);
      }

      // Step 5: Fetch ETF data (slowest, load last)
      console.log('🏦 Fetching ETF flow data (may take up to 60s)...');
      
      try {
        const etfData = await apiService.getETFFlows();
        console.log('🔍 ETF API response:', etfData);
        if (etfData) {
          // Handle both mock data format {btcFlows: [], ethFlows: []} and API format {flows: [...]}
          let processedETF = {};
          
          if (etfData.success && etfData.data) {
            // API format: {success: true, data: {flows: [...], summary: {...}}}
            if (etfData.data.flows && Array.isArray(etfData.data.flows)) {
              // Convert flows array to btcFlows/ethFlows structure
              processedETF.btcFlows = etfData.data.flows.map(flow => ({
                timestamp: new Date(flow.date || flow.timestamp),
                flow: flow.flow || 0,
                etf: flow.etf || 'Unknown'
              }));
              processedETF.ethFlows = []; // ETH flows not available in current API
            } else if (etfData.data.btcFlows || etfData.data.ethFlows) {
              // Already in correct format
              processedETF = etfData.data;
            }
          } else if (etfData.btcFlows || etfData.ethFlows) {
            // Direct mock format
            processedETF = etfData;
          } else {
            // Fallback to mock data structure  
            processedETF = {
              btcFlows: apiService.generateETFMockData('btc'),
              ethFlows: apiService.generateETFMockData('eth')
            };
          }
          
          console.log('🔍 ETF processed data:', processedETF);
          
          setMarketData(prev => ({
            ...prev,
            etfFlows: processedETF
          }));
          // Trigger pulsing animation for ETF chart
          setDataUpdated(prev => ({ ...prev, etf: true }));
          setTimeout(() => setDataUpdated(prev => ({ ...prev, etf: false })), 2000);
          console.log('✅ ETF data loaded and updated');
        }
      } catch (error) {
        console.warn('⚠️ ETF data failed, keeping mock data:', error);
        // Keep the existing mock data, no update needed
      }

      console.log('🎉 All progressive data loading completed!');

    } catch (error) {
      console.error('❌ Progressive data loading failed:', error);
      // Mock data is already loaded, so we're good
      console.log('🎭 Continuing with mock data due to API failure');
    }
  }, []);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Always load mock data first for instant UX
      const mockData = await mockDataService.getAllMarketData();
      console.log('🎭 Initial mock data loaded for instant UX');
      setMarketData(mockData);
      
      // Initialize price history from mock data for calculations
      if (mockData.bitcoin?.prices) {
        setPriceHistory({
          bitcoin: mockData.bitcoin.prices || [],
          ethereum: mockData.ethereum?.prices || [],
          solana: mockData.solana?.prices || []
        });
        
        // Calculate initial indicators from historical data
        ['bitcoin', 'ethereum', 'solana'].forEach(symbol => {
          if (mockData[symbol]?.prices && mockData[symbol].prices.length >= 14) {
            const indicators = calculateRealtimeIndicators(mockData[symbol].prices);
            setCalculatedIndicators(prev => ({
              ...prev,
              [symbol]: indicators
            }));
            console.log(`📊 Initial indicators calculated for ${symbol}:`, indicators);
          }
        });
      }
      
      setLoading(false); // Show UI immediately with mock data
      
      if (useRealAPI) {
        // Progressive loading with real API over mock data
        await fetchProgressiveData();
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch market data');
      console.error(err);
      setLoading(false);
    }
  }, [useRealAPI, fetchProgressiveData]);

  useEffect(() => {
    // Disabled interval to prevent rate limiting - user can manually refresh via sidebar
    // const interval = setInterval(fetchMarketData, 300000); // Update every 5 minutes
    fetchMarketData(); // Only fetch once on mount
    // return () => clearInterval(interval);
  }, [fetchMarketData]); // Re-fetch when API mode changes

  const testRSIScenario = async (scenario) => {
    try {
      setLoading(true);
      setRsiScenario(scenario);
      
      // Generate new RSI data with the selected scenario
      mockDataService.generateRSIScenario(scenario);
      
      // Fetch updated market data
      const data = await mockDataService.getAllMarketData();
      setMarketData(data);
      setError(null);
    } catch (err) {
      setError('Failed to generate RSI scenario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  // Loading indicator for ApexCharts
  const getLoadingOptions = (title) => ({
    chart: {
      height: 400,
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    theme: { mode: darkMode ? 'dark' : 'light' },
    title: {
      text: title,
      style: { color: darkMode ? '#fff' : '#000', fontSize: '16px', fontWeight: 600 }
    },
    noData: {
      text: 'Chart data unavailable',
      style: {
        color: darkMode ? '#666' : '#999',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    }
  });

  // Enhanced Bitcoin chart with Moving Averages - Professional Trader Grade
  const getBitcoinChartOptions = () => {
    if (!marketData?.bitcoin?.prices) {
      return {
        series: [],
        options: getLoadingOptions('BTC Price with Moving Averages')
      };
    }

    const series = [
      {
        name: 'BTC Price',
        type: 'line',
        data: marketData.bitcoin.prices.map(item => [
          item.timestamp.getTime(),
          Math.round(item.price)
        ])
      }
    ];

    // Add moving averages with distinct styles
    const maPeriods = [20, 50, 100, 200];
    maPeriods.forEach((period, index) => {
      if (marketData.bitcoin.movingAverages[period]) {
        series.push({
          name: `${period}d MA`,
          type: 'line',
          data: marketData.bitcoin.movingAverages[period].map(item => [
            item.timestamp.getTime(),
            Math.round(item.value)
          ]),
          stroke: {
            dashArray: index % 2 === 0 ? 0 : 5 // Dashed for some MAs for distinction
          }
        });
      }
    });

    return {
      series,
      options: {
        chart: {
          id: 'btc-chart',
          height: 400,
          type: 'line',
          background: 'transparent',
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true
            }
          },
          zoom: {
            enabled: true,
            type: 'x',
            autoScaleYaxis: true
          },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: { enabled: true }
          }
        },
        theme: { mode: darkMode ? 'dark' : 'light' },
        colors: ['#F7931A', '#8B5CF6', '#06B6D4', '#10B981'], // High contrast colors
        stroke: {
          width: [3, 2, 2, 2], // Thicker main line
          curve: 'smooth',
          dashArray: [0, 0, 5, 5] // Dashed for longer MAs
        },
        title: {
          text: 'BTC Price with Moving Averages',
          align: 'left',
          style: { 
            color: darkMode ? '#fff' : '#000',
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif'
          }
        },
        subtitle: {
          text: '220-Day Historical View with Key Indicators',
          align: 'left',
          style: {
            color: darkMode ? '#9CA3AF' : '#4B5563',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }
        },
        xaxis: {
          type: 'datetime',
          labels: {
            format: 'MMM dd',
            style: { 
              colors: darkMode ? '#D1D5DB' : '#4B5563',
              fontSize: '12px',
              fontWeight: 500
            }
          },
          axisBorder: { color: darkMode ? '#374151' : '#D1D5DB' },
          axisTicks: { color: darkMode ? '#374151' : '#D1D5DB' }
        },
        yaxis: {
          opposite: false,
          logarithmic: false, // Can enable for better scaling if prices vary greatly
          labels: {
            style: { 
              colors: darkMode ? '#D1D5DB' : '#4B5563',
              fontSize: '12px',
              fontWeight: 500
            },
            formatter: (val) => `$${val.toLocaleString()}`
          },
          title: {
            text: 'Price (USD)',
            style: {
              color: darkMode ? '#9CA3AF' : '#6B7280',
              fontSize: '14px',
              fontWeight: 600
            }
          }
        },
        grid: {
          borderColor: darkMode ? '#374151' : '#E5E7EB',
          strokeDashArray: 3,
          padding: { top: 0, right: 20, bottom: 0, left: 20 }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'right',
          offsetY: -10,
          labels: { colors: darkMode ? '#D1D5DB' : '#4B5563' },
          fontSize: '12px',
          fontWeight: 500,
          markers: { width: 12, height: 12 }
        },
        tooltip: {
          theme: darkMode ? 'dark' : 'light',
          followCursor: true,
          x: { format: 'dd MMM yyyy HH:mm' },
          y: { formatter: (val) => `$${val.toLocaleString()}` },
          marker: { show: true },
          items: { display: 'flex' }
        },
        markers: {
          size: [0, 0, 0, 0], // No markers for clean look
          hover: { size: 6 }
        },
        responsive: [{
          breakpoint: 1024,
          options: {
            chart: { height: 300 },
            legend: { position: 'bottom' }
          }
        }]
      }
    };
  };

//  DXY Chart 
const getDXYChartOptions = () => {
  console.log('🔍 DXY Chart - marketData.dxy:', marketData?.dxy);
  // Check for different data structures: mock data has .prices, API has .historical
  const dxyPrices = marketData?.dxy?.prices || marketData?.dxy?.historical;
  console.log('🔍 DXY prices array:', dxyPrices);
  if (!dxyPrices || !Array.isArray(dxyPrices) || dxyPrices.length === 0) {
    return {
      series: [],
      options: {
        ...getLoadingOptions('US Dollar Index (DXY)'),
        chart: {
          ...getLoadingOptions('US Dollar Index (DXY)').chart,
          height: 200, // Reduced from 300
          type: 'area'
        }
      }
    };
  }

  return {
    series: [{
      name: 'DXY',
      data: dxyPrices.map(item => [
        new Date(item.timestamp || item.date).getTime(),
        item.price || item.value
      ])
    }],
    options: {
      chart: {
        height: 160, // Reduced from 200 to match other cards
        type: 'area',
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      theme: { mode: darkMode ? 'dark' : 'light' },
      colors: ['#10B981'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: darkMode ? 'dark' : 'light',
          shadeIntensity: 0.7,
          opacityFrom: 0.5,
          opacityTo: 0.1,
          stops: [0, 100]
        }
      },
      stroke: { width: 2, curve: 'smooth' },
      dataLabels: {
        enabled: false
      },
      title: {
        text: 'US Dollar Index (DXY)',
        align: 'left',
        style: { 
          color: darkMode ? '#fff' : '#000', 
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif'
        },
        margin: 0, // Reduce title margin
        offsetY: 0
      },
      xaxis: {
        type: 'datetime',
        labels: { 
          show: true,
          format: 'MMM dd',
          style: { 
            colors: darkMode ? '#D1D5DB' : '#4B5563',
            fontSize: '10px' // Smaller font
          } 
        },
        axisBorder: { show: false }
      },
      yaxis: {
        labels: {
          style: { 
            colors: darkMode ? '#D1D5DB' : '#4B5563',
            fontSize: '10px' // Smaller font
          },
          formatter: (val) => val.toFixed(2)
        },
        title: {
          text: 'Index Value',
          style: {
            color: darkMode ? '#9CA3AF' : '#6B7280',
            fontSize: '11px' // Smaller font
          }
        }
      },
      grid: { 
        borderColor: darkMode ? '#374151' : '#E5E7EB',
        strokeDashArray: 3,
        padding: { left: 5, right: 5, top: 0, bottom: 0 } // Reduced padding
      },
      tooltip: {
        theme: darkMode ? 'dark' : 'light',
        x: { format: 'dd MMM yyyy' },
        y: { formatter: (val) => val.toFixed(2) }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: { height: 140 }, // Smaller on mobile
          yaxis: { labels: { fontSize: '9px' } }
        }
      }]
    }
  };
};

  // BTC ETF Flows Chart - Bar Chart with Negative Values
  const getETFFlowsOptions = () => {
    console.log('🔍 ETF Chart - marketData.etfFlows:', marketData?.etfFlows);
    // Check for different data structures: mock has direct .btcFlows, API might have nested structure
    const btcFlows = marketData?.etfFlows?.btcFlows || marketData?.etfFlows?.btc_flows || marketData?.etfFlows?.flows?.btc;
    console.log('🔍 ETF btcFlows array:', btcFlows);
    if (!btcFlows || !Array.isArray(btcFlows) || btcFlows.length === 0) {
      return {
        series: [],
        options: {
          ...getLoadingOptions('BTC Spot ETF Net Flows'),
          chart: {
            ...getLoadingOptions('BTC Spot ETF Net Flows').chart,
            height: 300,
            type: 'bar'
          }
        }
      };
    }

    const btcData = btcFlows.map(item => ({
      x: new Date(item.timestamp || item.date).getTime(),
      y: Math.round((item.flow || item.value || item.amount) / 1000000) // Convert to millions
    }));

    return {
      series: [
        { name: 'BTC ETF Flows', data: btcData }
      ],
      options: {
        chart: {
          height: 300,
          type: 'bar',
          background: '#000000',
          stacked: false,
          toolbar: { show: true, offsetY: -20 },
          zoom: { enabled: true, type: 'x' },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800
          }
        },
        theme: { mode: 'dark' },
        colors: ['#10B981'],
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '70%',
            endingShape: 'rounded',
            colors: {
              ranges: [{
                from: -1000,
                to: -0.01,
                color: '#EF4444'
              }, {
                from: 0.01,
                to: 1000,
                color: '#10B981'
              }]
            }
          }
        },
        dataLabels: {
          enabled: false
        },
        title: {
          text: 'BTC Spot ETF Net Flows',
          align: 'left',
          style: { 
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600
          }
        },
        xaxis: {
          type: 'datetime',
          labels: { 
            format: 'MMM dd',
            style: { 
              colors: '#D1D5DB',
              fontSize: '12px'
            } 
          }
        },
        yaxis: {
          labels: {
            style: { 
              colors: '#D1D5DB',
              fontSize: '12px'
            },
            formatter: (val) => `$${val}M`
          },
          title: {
            text: 'Net Flow (Millions USD)',
            style: {
              color: '#9CA3AF',
              fontSize: '14px'
            }
          }
        },
        grid: { 
          borderColor: '#374151',
          strokeDashArray: 3
        },
        legend: {
          show: false
        },
        tooltip: {
          theme: 'dark',
          y: { formatter: (val) => `$${val}M` }
        },
        responsive: [{
          breakpoint: 1024,
          options: {
            chart: { height: 250 },
            plotOptions: { bar: { columnWidth: '80%' } }
          }
        }]
      }
    };
  };

  // Volume Analysis Card Component (Enhanced Styling)
  const VolumeAnalysisCard = () => {
    if (!marketData) return (
      <div className="flex items-center justify-center h-48">
        <div className={`${colors.text.muted} text-center`}>
          <div className="animate-pulse">🔄</div>
          <div className="mt-2">Loading Volume Data...</div>
        </div>
      </div>
    );

    const btcVolume = marketData?.bitcoin?.volume24h || 0;
    const ethVolume = marketData?.ethereum?.volume24h || 0;
    const solVolume = marketData?.solana?.volume24h || 0;
    
    const formatVolume = (volume) => {
      if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
      if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
      if (volume >= 1e3) return `$${(volume / 1e3).toFixed(1)}K`;
      return `$${volume.toFixed(2)}`;
    };

    const totalVolume = btcVolume + ethVolume + solVolume;
    
    return (
      <div>
        <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>24h Volume Analysis</h3>
        
        <div className="space-y-4">
          {/* BTC Volume */}
          <div className={`flex justify-between items-center p-3 ${colors.bg.tertiary} rounded-lg ${colors.bg.hover} transition-colors duration-300 shadow-sm`}>
            <div className="flex items-center space-x-3">
              <div className="text-orange-500 text-xl">₿</div>
              <div>
                <div className={`text-sm font-medium ${colors.text.primary}`}>Bitcoin</div>
                <div className={`text-xs ${colors.text.muted}`}>Volume Dominance</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-orange-400">{formatVolume(btcVolume)}</div>
              <div className={`text-xs ${colors.text.muted}`}>{((btcVolume / totalVolume) * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* ETH Volume */}
          <div className={`flex justify-between items-center p-3 ${colors.bg.tertiary} rounded-lg ${colors.bg.hover} transition-colors duration-300 shadow-sm`}>
            <div className="flex items-center space-x-3">
              <div className="text-blue-500 text-xl">Ξ</div>
              <div>
                <div className={`text-sm font-medium ${colors.text.primary}`}>Ethereum</div>
                <div className={`text-xs ${colors.text.muted}`}>Volume Share</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-blue-400">{formatVolume(ethVolume)}</div>
              <div className={`text-xs ${colors.text.muted}`}>{((ethVolume / totalVolume) * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* SOL Volume */}
          <div className={`flex justify-between items-center p-3 ${colors.bg.tertiary} rounded-lg ${colors.bg.hover} transition-colors duration-300 shadow-sm`}>
            <div className="flex items-center space-x-3">
              <div className="text-purple-500 text-xl">◎</div>
              <div>
                <div className={`text-sm font-medium ${colors.text.primary}`}>Solana</div>
                <div className={`text-xs ${colors.text.muted}`}>Volume Share</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-purple-400">{formatVolume(solVolume)}</div>
              <div className={`text-xs ${colors.text.muted}`}>{((solVolume / totalVolume) * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Total Volume Summary */}
          <div className={`mt-6 p-4 ${colors.bg.card} rounded-lg ${colors.border.secondary} border ${colors.shadow.card}`}>
            <div className="text-center">
              <div className={`text-xs ${colors.text.muted} mb-1`}>Total 24h Volume</div>
              <div className={`text-2xl font-bold ${colors.text.primary}`}>{formatVolume(totalVolume)}</div>
              <div className="text-xs text-green-400 mt-1">📊 Live Data</div>
            </div>
          </div>

          {/* Volume Trend Indicator */}
          <div className="flex justify-center">
            <div className={`text-xs px-3 py-1 ${colors.bg.tertiary} ${colors.text.accent} rounded-full shadow-sm`}>
              📈 Market Activity: {totalVolume > 50e9 ? 'High' : totalVolume > 20e9 ? 'Moderate' : 'Low'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Funding Rates Visualization with Horizontal Segmented Bars
const FundingRatesCard = () => {
  if (!marketData?.fundingRates) return null;

  const { btc, eth } = marketData.fundingRates;

  // Enhanced horizontal segmented bar component
  const SegmentedFundingBar = ({ rate, symbol, symbolColor, trend }) => {
    const ratePercent = rate * 100;
    const absRate = Math.abs(ratePercent);
    
    // Calculate intensity based on rate magnitude (0-0.15% = low, >0.3% = high)
    const intensity = Math.min(absRate / 0.3, 1); // Normalize to 0-1
    const isPositive = rate >= 0;
    
    // Dynamic color based on intensity
    const getBarColor = () => {
      if (isPositive) {
        // Green gradient: light to dark based on intensity
        const greenAlpha = 0.3 + (intensity * 0.7); // 0.3 to 1.0
        return `rgba(34, 197, 94, ${greenAlpha})`; // green-500 with variable alpha
      } else {
        // Red gradient: light to dark based on intensity
        const redAlpha = 0.3 + (intensity * 0.7); // 0.3 to 1.0
        return `rgba(239, 68, 68, ${redAlpha})`; // red-500 with variable alpha
      }
    };

    // Calculate fill percentage (max 50% of total width on each side)
    const fillPercent = Math.min((absRate / 0.3) * 50, 50); // Max 0.3% = 50% fill

    return (
      <div className={`p-4 ${colors.bg.tertiary} rounded-lg border ${colors.border.primary} hover:shadow-md transition-all duration-300`}>
        {/* Symbol and Trend Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`text-2xl font-bold ${symbolColor}`}>{symbol}</div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              trend === 'bearish' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              <span className="mr-1">{trend === 'bearish' ? '📉' : '📈'}</span>
              {trend === 'bearish' ? 'Bearish' : 'Bullish'}
            </div>
          </div>
        </div>

        {/* Horizontal Segmented Bar */}
        <div className="relative mb-3">
          {/* Background bar with center line */}
          <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden border">
            {/* Center line */}
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-400 z-10 transform -translate-x-0.5"></div>
            
            {/* Negative (Red) Side - Left */}
            <div className="absolute left-0 top-0 w-1/2 h-full">
              {!isPositive && (
                <div 
                  className="absolute right-0 top-0 h-full rounded-l-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${fillPercent * 2}%`,
                    backgroundColor: getBarColor(),
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
                  }}
                ></div>
              )}
            </div>
            
            {/* Positive (Green) Side - Right */}
            <div className="absolute right-0 top-0 w-1/2 h-full">
              {isPositive && (
                <div 
                  className="absolute left-0 top-0 h-full rounded-r-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${fillPercent * 2}%`,
                    backgroundColor: getBarColor(),
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
                  }}
                ></div>
              )}
            </div>

            {/* Rate Value Display with Arrow */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="relative">
                {/* Arrow/Needle pointing to value */}
                <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent ${
                  isPositive ? 'border-b-green-600' : 'border-b-red-600'
                }`}></div>
                
                {/* Rate value */}
                <div className={`px-3 py-1 rounded-full text-sm font-bold shadow-lg border-2 ${
                  isPositive 
                    ? 'bg-green-50 text-green-800 border-green-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {ratePercent >= 0 ? '+' : ''}{ratePercent.toFixed(4)}%
                </div>
              </div>
            </div>
          </div>

          {/* Scale markers */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>-0.3%</span>
            <span>-0.15%</span>
            <span className="font-medium">0%</span>
            <span>+0.15%</span>
            <span>+0.3%</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>Intensity: {(intensity * 100).toFixed(0)}%</span>
          <span>{isPositive ? 'Longs pay shorts' : 'Shorts pay longs'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`${colors.bg.card} rounded-lg p-4 ${colors.border.primary} border hover:border-cyan-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-cyan-500/20 hover:scale-[1.01] transition-transform`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Perpetual Funding Rates</h3>
        <Tooltip
          title={CryptoTooltips.FundingRates.title}
          content={CryptoTooltips.FundingRates.content}
          educational={true}
          position="top"
          maxWidth="480px"
        >
          <div className={`w-5 h-5 ${colors.bg.secondary} ${colors.text.tertiary} rounded-full flex items-center justify-center text-xs font-bold cursor-help hover:${colors.bg.hover} transition-colors`}>
            ?
          </div>
        </Tooltip>
      </div>
      
      {/* Enhanced Funding Rates with Segmented Bars */}
      <div className="space-y-4">
        <SegmentedFundingBar 
          rate={btc.rate} 
          symbol="BTC" 
          symbolColor="text-orange-500" 
          trend={btc.trend} 
        />
        
        <SegmentedFundingBar 
          rate={eth.rate} 
          symbol="ETH" 
          symbolColor="text-blue-500" 
          trend={eth.trend} 
        />
      </div>
      
      {/* Enhanced Footer */}
      <div className={`mt-4 p-3 ${colors.bg.tertiary} rounded-md`}>
        <div className={`text-xs ${colors.text.muted} text-center`}>
          <div className="flex justify-center items-center space-x-4 mb-1">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-green-400 rounded-sm"></div>
              <span>Positive = Bullish pressure</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-red-400 rounded-sm"></div>
              <span>Negative = Bearish pressure</span>
            </div>
          </div>
          <div className="text-gray-500">8-hour funding intervals • Live rates from perpetual swaps</div>
        </div>
      </div>
    </div>
  );
};


  // Price Cards 
const PriceCards = () => {
  if (!marketData) return null;

  const btcPrice = marketData.bitcoin?.currentPrice || 0;
  const btcChangePercent = marketData.bitcoin?.priceChangePercent24h || 0;
  
  const ethPrice = marketData.ethereum?.currentPrice || 0;
  const ethChangePercent = marketData.ethereum?.priceChangePercent24h || 0;
  
  const solPrice = marketData.solana?.currentPrice || 0;
  const solChangePercent = marketData.solana?.priceChangePercent24h || 0;

  const formatPrice = (price) => {
    if (price < 0.001) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (percent) => {
    const isPositive = percent >= 0;
    const bgClass = isPositive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400';
    const sign = isPositive ? '+' : '-';
    const arrow = isPositive ? '↑' : '↓';
    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded-full ${bgClass} text-sm font-medium`}>
        {sign}{Math.abs(percent).toFixed(2)}% <span className="ml-1">{arrow}</span>
      </div>
    );
  };

  const Sparkline = ({ prices, isPositive }) => {
    if (!prices || prices.length === 0) return null;
    
    const series = [{
      data: prices.map(item => item.price)
    }];

    const options = {
      chart: {
        type: 'area',
        height: 40,
        sparkline: { enabled: true },
        animations: { enabled: false }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.1,
          stops: [0, 100]
        }
      },
      colors: [isPositive ? '#10B981' : '#EF4444'],
      tooltip: { enabled: false }
    };

    return <Chart options={options} series={series} type="area" height={40} width="100%" />;
  };

  const getRecentPrices = (assetData) => {
    return assetData?.prices?.slice(-30) || []; // Last 30 points for sparkline
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
      {/* Bitcoin Card */}
      <div className={`bg-gradient-to-br ${colors.bg.secondary} ${colors.bg.tertiary} rounded-xl p-4 md:p-4 ${colors.border.primary} border hover:border-[#fbc318] transition-all duration-300 ${colors.shadow.card} hover:shadow-[#fbc318]/20 hover:scale-[1.01] transition-transform ${
        dataUpdated.prices ? 'animate-pulse ring-4 ring-[#fbc318]/50 shadow-2xl shadow-[#fbc318]/30' : ''
      }`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="text-orange-500 text-2xl font-bold">₿</div>
          </div>
          <h3 className={`text-base md:text-lg font-semibold ${colors.text.primary}`}>BTC-USD</h3>
        </div>
        <Sparkline 
          prices={getRecentPrices(marketData.bitcoin)} 
          isPositive={btcChangePercent >= 0} 
        />
        <div className="mt-2 mb-1">
          {formatChange(btcChangePercent)}
        </div>
        <div className={`text-3xl md:text-4xl font-bold ${colors.text.primary}`}>
          {formatPrice(btcPrice)}
        </div>
      </div>

      {/* Ethereum Card */}
      <div className={`bg-gradient-to-br ${colors.bg.secondary} ${colors.bg.tertiary} rounded-xl p-4 md:p-4 ${colors.border.primary} border hover:border-blue-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-blue-500/20 hover:scale-[1.01] transition-transform ${
        dataUpdated.prices ? 'animate-pulse ring-4 ring-blue-500/50 shadow-2xl shadow-blue-500/30' : ''
      }`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="text-blue-500 text-2xl font-bold">Ξ</div>
          </div>
          <h3 className={`text-base md:text-lg font-semibold ${colors.text.primary}`}>ETH-USD</h3>
        </div>
        <Sparkline 
          prices={getRecentPrices(marketData.ethereum)} 
          isPositive={ethChangePercent >= 0} 
        />
        <div className="mt-2 mb-1">
          {formatChange(ethChangePercent)}
        </div>
        <div className={`text-3xl md:text-4xl font-bold ${colors.text.primary}`}>
          {formatPrice(ethPrice)}
        </div>
      </div>

      {/* Solana Card */}
      <div className={`bg-gradient-to-br ${colors.bg.secondary} ${colors.bg.tertiary} rounded-xl p-4 md:p-4 ${colors.border.primary} border hover:border-purple-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-purple-500/20 hover:scale-[1.01] transition-transform ${
        dataUpdated.prices ? 'animate-pulse ring-4 ring-purple-500/50 shadow-2xl shadow-purple-500/30' : ''
      }`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="text-purple-500 text-2xl font-bold">◎</div>
          </div>
          <h3 className={`text-base md:text-lg font-semibold ${colors.text.primary}`}>SOL-USD</h3>
        </div>
        <Sparkline 
          prices={getRecentPrices(marketData.solana)} 
          isPositive={solChangePercent >= 0} 
        />
        <div className="mt-2 mb-1">
          {formatChange(solChangePercent)}
        </div>
        <div className={`text-3xl md:text-4xl font-bold ${colors.text.primary}`}>
          {formatPrice(solPrice)}
        </div>
      </div>
    </div>
  );
};

  if (loading || !marketData) {
    return (
      <div className={`min-h-screen ${colors.bg.primary} flex items-center justify-center transition-colors duration-300`}>
        <RetailDAOLoader size={100} message="Loading RetailDAO Terminal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${colors.bg.primary} flex items-center justify-center transition-colors duration-300`}>
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg.primary} ${colors.text.primary} flex flex-col md:flex-row transition-colors duration-300`}>
      {/* Enhanced Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        fetchMarketData={fetchMarketData}
        loading={loading}
        useRealAPI={useRealAPI}
        setUseRealAPI={setUseRealAPI}
        testRSIScenario={testRSIScenario}
        rsiScenario={rsiScenario}
        connectionStatus={connectionStatus}
      />

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleSidebar}
          className={`md:hidden fixed top-4 left-4 z-50 p-2 ${colors.bg.tertiary} rounded-lg ${colors.text.primary} transition-colors duration-300`}
        >
          <Menu size={24} />
        </button>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}

        {/* Header */}
        <div className="text-center mb-6 md:mb-8 mt-12 md:mt-0">
          <h1 className={`text-3xl md:text-4xl font-bold ${colors.text.primary} mb-2 transition-colors duration-300`}>
            <span className={`${colors.text.primary}`}>Retail DAO</span> Terminal
          </h1>
          <p className={`${colors.text.muted} text-sm md:text-base transition-colors duration-300`}>Real-time crypto market insights and analysis</p>
        </div>

        {/* Price Cards */}
        <PriceCards />


        {/* Main Dashboard Grid - 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Column 1: Bitcoin Chart + RSI Indicators */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Bitcoin Chart */}
            <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-[#fbc318] transition-all duration-300 ${colors.shadow.card} hover:shadow-[#fbc318]/20 hover:scale-[1.01] transition-transform ${
              dataUpdated.btc ? 'animate-pulse ring-4 ring-[#fbc318]/50 shadow-2xl shadow-[#fbc318]/30' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${colors.text.primary}`}>BTC Price with Moving Averages</h3>
                <Tooltip
                  title={CryptoTooltips.MovingAverages.title}
                  content={CryptoTooltips.MovingAverages.content}
                  educational={true}
                  position="top"
                  maxWidth="480px"
                >
                  <div className={`w-5 h-5 ${colors.bg.secondary} ${colors.text.tertiary} rounded-full flex items-center justify-center text-xs font-bold cursor-help hover:${colors.bg.hover} transition-colors`}>
                    ?
                  </div>
                </Tooltip>
              </div>
              <Chart 
                options={getBitcoinChartOptions().options} 
                series={getBitcoinChartOptions().series} 
                type="line" 
                height={300} 
                width="100%"
              />
            </div>
            
            {/* RSI Indicators - Using Live WebSocket Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* BTC RSI */}
              <div className={`${colors.bg.card} rounded-lg p-6 border ${colors.border.primary} hover:border-[#fbc318] transition-all duration-300 hover:shadow-lg hover:shadow-[#fbc318]/20 hover:scale-[1.01] transition-transform ${
                dataUpdated.rsi ? 'animate-pulse ring-4 ring-[#fbc318]/50 shadow-2xl shadow-[#fbc318]/30' : ''
              }`}>
                <LiveRSIDisplay 
                  symbol="BTC" 
                  theme="orange"
                  showDataSource={true}
                  rsiData={calculatedIndicators?.bitcoin?.rsi || marketData?.bitcoin?.rsi}
                  loading={loading}
                  wsConnected={connectionStatus.isConnected}
                />
              </div>
              
              {/* ETH RSI */}
              <div className={`${colors.bg.card} rounded-lg p-6 border ${colors.border.primary} hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] transition-transform ${
                dataUpdated.rsi ? 'animate-pulse ring-4 ring-blue-500/50 shadow-2xl shadow-blue-500/30' : ''
              }`}>
                <LiveRSIDisplay 
                  symbol="ETH" 
                  theme="blue"
                  showDataSource={true}
                  rsiData={calculatedIndicators?.ethereum?.rsi || marketData?.ethereum?.rsi}
                  loading={loading}
                  wsConnected={connectionStatus.isConnected}
                />
              </div>
            </div>
          </div>
          
         {/* Column 2: DXY + Funding Rates + Volume Analysis */}
  <div className="space-y-4 md:space-y-6">
    {/* DXY Chart */}
    <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-green-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-green-500/20 hover:scale-[1.01] transition-transform flex flex-col ${
      dataUpdated.dxy ? 'animate-pulse ring-4 ring-green-500/50 shadow-2xl shadow-green-500/30' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${colors.text.primary}`}>US Dollar Index (DXY)</h3>
        <Tooltip
          title={CryptoTooltips.DXY.title}
          content={CryptoTooltips.DXY.content}
          educational={true}
          position="top"
          maxWidth="480px"
        >
          <div className={`w-5 h-5 ${colors.bg.secondary} ${colors.text.tertiary} rounded-full flex items-center justify-center text-xs font-bold cursor-help hover:${colors.bg.hover} transition-colors`}>
            ?
          </div>
        </Tooltip>
      </div>
      <Chart 
        options={getDXYChartOptions().options} 
        series={getDXYChartOptions().series} 
        type="area" 
        height={242} 
        width="100%"
      />
      
      {/* DXY Stats */}
      <div className="mt-3 space-y-2 text-sm flex-shrink-0">
        <div className="flex justify-between">
          <span className={`${colors.text.muted}`}>Current Value:</span>
          <span className={`${colors.text.primary} font-mono`}>
            {(marketData?.dxy?.currentPrice || marketData?.dxy?.current?.value)?.toFixed(2) || '102.61'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={`${colors.text.muted}`}>Trend:</span>
          <span className="text-yellow-400">Moderate</span>
        </div>
      </div>
    </div>

    {/* Perpetual Funding Rates Card */}
    <div className={`hover:scale-[1.01] transition-transform duration-300 ${
      dataUpdated.funding ? 'animate-pulse' : ''
    }`}>
      <div className={dataUpdated.funding ? 'ring-4 ring-cyan-500/50 shadow-2xl shadow-cyan-500/30 rounded-lg' : ''}>
        <FundingRatesCard />
      </div>
    </div>
  </div>
        </div>

        {/* ETF Flows and Volume Analysis Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* ETF Flows Chart - Takes 2 columns with Progressive Loading */}
          <div className="lg:col-span-2">
            <ProgressiveLoader
              isLoading={false}
              hasData={marketData?.etfFlows?.btcFlows}
              skeleton={<ETFFlowsSkeleton />}
            >
              <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-blue-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-blue-500/20 hover:scale-[1.01] transition-transform ${
                dataUpdated.etf ? 'animate-pulse ring-4 ring-blue-500/50 shadow-2xl shadow-blue-500/30' : ''
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${colors.text.primary}`}>BTC Spot ETF Net Flows</h3>
                  <Tooltip
                    title={CryptoTooltips.ETFFlows.title}
                    content={CryptoTooltips.ETFFlows.content}
                    educational={true}
                    position="top"
                    maxWidth="480px"
                  >
                    <div className={`w-5 h-5 ${colors.bg.secondary} ${colors.text.tertiary} rounded-full flex items-center justify-center text-xs font-bold cursor-help hover:${colors.bg.hover} transition-colors`}>
                      ?
                    </div>
                  </Tooltip>
                </div>
                <Chart 
                  options={getETFFlowsOptions().options} 
                  series={getETFFlowsOptions().series} 
                  type="bar" 
                  height={300} 
                  width="100%"
                />
                
                {/* BTC ETF Summary */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`text-center p-3 ${colors.bg.tertiary} rounded shadow-inner`}>
                    <div className={`text-sm ${colors.text.muted}`}>7-Day Net Flow</div>
                    <div className="text-lg font-bold text-red-400">
                      {marketData?.etfFlows?.summary?.sevenDayFlow || '-$573M'}
                    </div>
                    <div className="text-xs text-red-300">
                      {marketData?.etfFlows?.summary?.sevenDayTrend || 'Very Strong Outflows'}
                    </div>
                  </div>
                  <div className={`text-center p-3 ${colors.bg.tertiary} rounded shadow-inner`}>
                    <div className={`text-sm ${colors.text.muted}`}>30-Day Net Flow</div>
                    <div className="text-lg font-bold text-green-400">
                      {marketData?.etfFlows?.summary?.thirtyDayFlow || '+$1.2B'}
                    </div>
                    <div className="text-xs text-green-300">
                      {marketData?.etfFlows?.summary?.thirtyDayTrend || 'Strong Inflows'}
                    </div>
                  </div>
                </div>
              </div>
            </ProgressiveLoader>
          </div>

          {/* Volume Analysis Card - Takes 1 column */}
          <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-purple-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-purple-500/20 hover:scale-[1.01] transition-transform`}>
            <VolumeAnalysisCard />
          </div>
        </div>

        {/* Additional Market Info Row - Hidden for first iteration */}
        {/* 
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Market Fear & Greed */}
          {/* 
          <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-red-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-red-500/20`}>
            <h3 className={`text-lg font-semibold mb-4 ${colors.text.primary}`}>Fear & Greed Index</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-red-400 mb-2">25</div>
              <div className="text-red-300 mb-4">Extreme Fear</div>
              <div className={`w-full ${colors.bg.tertiary} rounded-full h-3`}>
                <div className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full" 
                     style={{ width: '25%' }}></div>
              </div>
              <div className={`flex justify-between text-xs ${colors.text.muted} mt-2`}>
                <span>Fear</span>
                <span>Greed</span>
              </div>
            </div>
          </div>

          {/* Volume Profile */}
          {/* 
          <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-teal-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-teal-500/20`}>
            <h3 className={`text-lg font-semibold mb-4 ${colors.text.primary}`}>24h Volume</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className={`${colors.text.muted}`}>BTC Volume:</span>
                <span className={`font-mono ${colors.text.primary}`}>$28.5B</span>
              </div>
              <div className="flex justify-between">
                <span className={`${colors.text.muted}`}>ETH Volume:</span>
                <span className={`font-mono ${colors.text.primary}`}>$15.2B</span>
              </div>
              <div className="flex justify-between">
                <span className={`${colors.text.muted}`}>Total Crypto:</span>
                <span className={`font-mono ${colors.text.primary}`}>$97.8B</span>
              </div>
              <div className="mt-4 text-center">
                <div className={`text-sm ${colors.text.muted}`}>Volume Trend</div>
                <div className="text-red-400">📉 -12.5% from yesterday</div>
              </div>
            </div>
          </div>

          {/* Key Levels */}
          {/* 
          <div className={`${colors.bg.card} rounded-xl p-4 md:p-6 ${colors.border.primary} border hover:border-yellow-500 transition-all duration-300 ${colors.shadow.card} hover:shadow-yellow-500/20`}>
            <h3 className={`text-lg font-semibold mb-4 ${colors.text.primary}`}>BTC Key Levels</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-red-400">Resistance:</span>
                <span className={`font-mono ${colors.text.primary}`}>$118,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400">Current:</span>
                <span className={`font-mono ${colors.text.primary}`}>
                  ${marketData?.bitcoin?.currentPrice?.toLocaleString() || '115,260'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">Support:</span>
                <span className={`font-mono ${colors.text.primary}`}>$112,000</span>
              </div>
              <div className="mt-4 text-center">
                <div className={`text-sm ${colors.text.muted}`}>Next Target</div>
                <div className="text-yellow-400">⚡ $120K breakout</div>
              </div>
            </div>
          </div>
        </div>
        */}

        {/* Footer */}
        <div className={`text-center ${colors.text.muted} text-sm mt-8 pb-4 transition-colors duration-300`}>
          <p>RetailDAO Terminal | Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-2 text-xs">
            Data sources: {useRealAPI ? 'CoinGecko API (Real-time)' : 'Mock Data (Demo)'} • 
            Real-time price updates via WebSocket • 
            BTC, ETH, SOL tracking with technical analysis
          </p>
          {useRealAPI && (
            <p className="mt-1 text-xs text-blue-400">
              ⚡ Live data powered by CoinGecko | BTC Chart: 220 days | RSI calculations available in mock mode
            </p>
          )}
          {!useRealAPI && (
            <p className="mt-1 text-xs text-yellow-400">
              🎭 Demo mode active | Test different RSI scenarios | Switch to real API for live data
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;