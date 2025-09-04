import { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import mockDataService from '../services/mockDataService';
import persistentMockService from '../services/persistentMockDataService';
import apiService from '../services/api';
import intelligentCacheService from '../services/intelligentCacheService';
import { LiveRSIDisplay } from './RSIGauge';
import { useCryptoPriceWebSocket, useIndicatorWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../context/ThemeContext';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Tooltip, { CryptoTooltips } from './Tooltip';
import { ETFFlowsSkeleton, ProgressiveLoader } from './SkeletonLoader';
 

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
  
  // Price update tracking removed - using pulseEffects instead
  
  const [dataUpdated, setDataUpdated] = useState({
    prices: false,
    btc: false,
    dxy: false,
    etf: false,
    rsi: false,
    funding: false
  });
  
  // Enhanced pulsating system with different types and intensities
  const [pulseEffects, setPulseEffects] = useState({
    priceCards: { active: false, type: 'websocket', intensity: 'normal', timestamp: null },
    btcChart: { active: false, type: 'api_fresh', intensity: 'normal', timestamp: null },
    ethChart: { active: false, type: 'api_fresh', intensity: 'normal', timestamp: null },
    dxyChart: { active: false, type: 'api_cached', intensity: 'subtle', timestamp: null },
    rsiIndicators: { active: false, type: 'websocket', intensity: 'strong', timestamp: null },
    fundingRates: { active: false, type: 'api_cached', intensity: 'normal', timestamp: null },
    etfFlows: { active: false, type: 'api_fresh', intensity: 'subtle', timestamp: null }
  });
  
  // WebSocket health tracking removed - using connectionStatus from hooks instead
  

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Enhanced WebSocket handler for price cards with error handling
  const handlePriceUpdate = useCallback((symbol, priceData) => {
    console.log('💰 WebSocket price update received:', symbol, priceData);
    
    // Validate input data to prevent errors
    if (!symbol || typeof symbol !== 'string' || !priceData) {
      console.warn('🚫 Invalid WebSocket data:', { symbol, priceData });
      return;
    }
    
    let symbolKey;
    const normalizedSymbol = symbol.toLowerCase();
    if (normalizedSymbol === 'btcusdt') {
      symbolKey = 'bitcoin';
    } else if (normalizedSymbol === 'ethusdt') {
      symbolKey = 'ethereum';
    } else if (normalizedSymbol === 'solusdt') {
      symbolKey = 'solana';
    } else {
      console.warn('🚫 Unknown WebSocket symbol:', symbol);
      return;
    }
    
    // Validate price data
    const price = parseFloat(priceData.price);
    const change24h = parseFloat(priceData.change24h || 0);
    
    if (isNaN(price)) {
      console.warn('🚫 Invalid price data:', priceData);
      return;
    }
    
    // Connection health tracked via connectionStatus from hook

    // Update market data with new price for price cards (both data paths)
    setMarketData(prevData => {
      if (!prevData) return prevData;
      
      console.log(`📈 Updating ${symbolKey} price:`, priceData.price);
      return {
        ...prevData,
        // Update main crypto object (for PriceCards component)
        [symbolKey]: {
          ...prevData[symbolKey],
          currentPrice: priceData.price,
          priceChangePercent24h: priceData.change24h,
          priceChange24h: priceData.change24h,
          lastUpdated: priceData.timestamp,
          source: 'WebSocket Live'
        },
        // Also update cryptoPrices path (for consistency with cached data structure)
        cryptoPrices: {
          ...prevData.cryptoPrices,
          [symbolKey]: {
            ...prevData.cryptoPrices?.[symbolKey],
            price: priceData.price,
            change: priceData.change24h,
            lastUpdated: priceData.timestamp,
            source: 'WebSocket Live'
          }
        }
      };
    });

    // Price updates now handled via pulseEffects state

    // Trigger enhanced pulsating animation for price cards
    setPulseEffects(prev => ({
      ...prev,
      priceCards: { 
        active: true, 
        type: 'websocket', 
        intensity: Math.abs(change24h) > 5 ? 'strong' : 'normal',
        timestamp: Date.now(),
        crypto: symbolKey
      }
    }));
    
    // Auto-clear the pulse after animation
    setTimeout(() => {
      setPulseEffects(prev => ({
        ...prev,
        priceCards: { ...prev.priceCards, active: false }
      }));
    }, 2500);
    
    // Legacy support for existing animations
    setDataUpdated(prev => ({ ...prev, prices: true }));
    setTimeout(() => setDataUpdated(prev => ({ ...prev, prices: false })), 2000);
  }, []);

  const { connectionStatus } = useCryptoPriceWebSocket(handlePriceUpdate);

  // Handle WebSocket indicator updates (RSI, Moving Averages)
  const handleIndicatorUpdate = useCallback((symbol, indicatorData) => {
    console.log(`📊 Received indicator update for ${symbol}:`, indicatorData);
    
    // Convert BTCUSDT -> bitcoin, ETHUSDT -> ethereum for data structure consistency
    const cryptoKey = symbol === 'BTCUSDT' ? 'bitcoin' : 
                     symbol === 'ETHUSDT' ? 'ethereum' : 
                     symbol === 'SOLUSDT' ? 'solana' : null;

    if (!cryptoKey) {
      console.warn(`⚠️ Unknown symbol for indicator update: ${symbol}`);
      return;
    }

    // Trigger price card pulse animation on every WebSocket update
    setPulseEffects(prev => ({
      ...prev,
      priceCards: {
        active: true,
        type: 'websocket_indicator',
        intensity: 'medium',
        timestamp: Date.now(),
        source: `${symbol} Indicators`
      }
    }));
    
    // Auto-clear pulse effect
    setTimeout(() => {
      setPulseEffects(prev => ({
        ...prev,
        priceCards: { ...prev.priceCards, active: false }
      }));
    }, 1500);

    setMarketData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      
      // Update RSI data from WebSocket - FIX: Properly merge with existing data
      if (indicatorData.rsi) {
        console.log(`🔄 Updating ${cryptoKey} RSI from WebSocket:`, indicatorData.rsi);
        
        // FIX: Validate RSI values before updating (RSI should be 0-100)
        const validatedRSI = {};
        Object.entries(indicatorData.rsi).forEach(([period, rsiValue]) => {
          if (typeof rsiValue === 'object' && rsiValue.current !== undefined) {
            const rsiCurrent = parseFloat(rsiValue.current);
            if (!isNaN(rsiCurrent) && rsiCurrent >= 0 && rsiCurrent <= 100) {
              validatedRSI[period] = rsiValue;
            } else {
              console.warn(`🚫 Invalid RSI value for ${cryptoKey} ${period}:`, rsiCurrent);
            }
          }
        });
        
        if (Object.keys(validatedRSI).length > 0) {
          updated[cryptoKey] = {
            ...updated[cryptoKey],
            rsi: {
              ...updated[cryptoKey]?.rsi, // Preserve existing RSI data
              ...validatedRSI // Update with validated new data
            }
          };
          
          // Also update global RSI for backward compatibility
          if (cryptoKey === 'bitcoin') {
            updated.rsi = {
              ...updated.rsi,
              ...validatedRSI
            };
          }
        }
      }
      
      // Update Moving Averages data from WebSocket
      if (indicatorData.movingAverages) {
        console.log(`🔄 Updating ${cryptoKey} MAs from WebSocket:`, indicatorData.movingAverages);
        
        // Convert WebSocket MA format to expected array format
        const convertedMAs = {};
        Object.entries(indicatorData.movingAverages).forEach(([period, data]) => {
          if (data && data.current !== undefined) {
            // Create array format expected by charts: [{ timestamp, value }]
            convertedMAs[period] = [{
              timestamp: new Date(data.timestamp || Date.now()),
              value: data.current
            }];
          }
        });
        
        updated[cryptoKey] = {
          ...updated[cryptoKey],
          movingAverages: {
            ...updated[cryptoKey]?.movingAverages,
            ...convertedMAs
          }
        };
      }
      
      return updated;
    });

    // Trigger enhanced pulsating animation for updated indicators
    setPulseEffects(prev => ({
      ...prev,
      rsiIndicators: {
        active: true,
        type: 'websocket',
        intensity: 'strong', // RSI changes are important
        timestamp: Date.now(),
        crypto: cryptoKey,
        source: 'WebSocket Indicators'
      }
    }));
    
    setTimeout(() => {
      setPulseEffects(prev => ({
        ...prev,
        rsiIndicators: { ...prev.rsiIndicators, active: false }
      }));
    }, 2000);
    
    // Legacy support
    setDataUpdated(prev => ({ ...prev, rsi: true, btc: cryptoKey === 'bitcoin' }));
    setTimeout(() => setDataUpdated(prev => ({ ...prev, rsi: false, btc: false })), 2000);
  }, []);

  const { connectionStatus: indicatorConnectionStatus } = useIndicatorWebSocket(handleIndicatorUpdate);

  // Progressive data loading function (defined first to avoid reference errors)
  const fetchProgressiveData = useCallback(async () => {
    try {
      console.log('🚀 Starting progressive data loading for fresh updates...');

      // Step 1: Fetch fresh multi-crypto data (BTC, ETH prices and analysis)
      console.log('📈 Fetching fresh multi-crypto data...');
      
      const multiCryptoData = await apiService.getMultiCryptoAnalysis('BTC,ETH', '220D');
      console.log('🔍 Multi-crypto API response:', multiCryptoData);
      if (multiCryptoData && multiCryptoData.success && multiCryptoData.data) {
        let hasUpdates = false;
        
        // Update each crypto's data and check for changes
        Object.entries(multiCryptoData.data).forEach(([symbol, data]) => {
          if (data && typeof data === 'object' && 'currentPrice' in data) {
            const cryptoKey = symbol.toLowerCase() === 'btc' ? 'bitcoin' : 
                            symbol.toLowerCase() === 'eth' ? 'ethereum' : symbol.toLowerCase();
            
            console.log(`🔄 Fresh update for ${cryptoKey} with price:`, data.currentPrice);
            setMarketData(prev => {
              // Check if this is actually new data to trigger animation
              const prevPrice = prev.cryptoPrices?.[cryptoKey]?.price || prev[cryptoKey]?.currentPrice;
              if (prevPrice !== data.currentPrice) {
                hasUpdates = true;
              }
              
              const updated = {
                ...prev,
                // Update price cards data
                cryptoPrices: {
                  ...prev.cryptoPrices,
                  [cryptoKey]: {
                    ...prev.cryptoPrices?.[cryptoKey],
                    price: data.currentPrice,
                    change: data.priceChangePercent24h || data.priceChange24h || 0,
                    volume: data.volume24h,
                    marketCap: data.marketCap,
                    historical: data.historical || prev.cryptoPrices?.[cryptoKey]?.historical
                  }
                },
                // Update main crypto object for backward compatibility
                [cryptoKey]: { 
                  ...prev[cryptoKey], 
                  currentPrice: data.currentPrice,
                  priceChangePercent24h: data.priceChangePercent24h,
                  volume24h: data.volume24h,
                  marketCap: data.marketCap,
                  prices: data.historical?.prices || data.prices || prev[cryptoKey]?.prices,
                  historical: data.historical || prev[cryptoKey]?.historical,
                  rsi: data.rsi || prev[cryptoKey]?.rsi,
                  movingAverages: data.movingAverages || prev[cryptoKey]?.movingAverages
                }
              };
              
              console.log(`✅ Fresh data updated for ${cryptoKey}:`, updated.cryptoPrices[cryptoKey]);
              return updated;
            });
          }
        });
        
        // Trigger enhanced pulsing animation only if we have fresh updates
        if (hasUpdates) {
          console.log('💫 Triggering enhanced pulse animations for fresh API data');
          
          // Price cards pulse - API fresh data style
          setPulseEffects(prev => ({
            ...prev,
            priceCards: {
              active: true,
              type: 'api_fresh',
              intensity: 'strong',
              timestamp: Date.now(),
              source: 'Multi-Crypto API'
            }
          }));
          
          // BTC chart pulse if BTC data updated
          setPulseEffects(prev => ({
            ...prev,
            btcChart: {
              active: true,
              type: 'api_fresh',
              intensity: 'normal',
              timestamp: Date.now()
            }
          }));
          
          // Auto-clear pulses
          setTimeout(() => {
            setPulseEffects(prev => ({
              ...prev,
              priceCards: { ...prev.priceCards, active: false },
              btcChart: { ...prev.btcChart, active: false }
            }));
          }, 3000);
          
          // Legacy support
          setDataUpdated(prev => ({ ...prev, prices: true }));
          setTimeout(() => setDataUpdated(prev => ({ ...prev, prices: false })), 2000);
        }
        console.log('✅ Fresh multi-crypto data processed');
      } else {
        console.warn('⚠️ Fresh multi-crypto data failed or invalid format:', multiCryptoData);
      }

      // Step 2: Fetch DXY data only (BTC analysis and RSI now provided by WebSocket indicators)
      console.log('📈 Fetching DXY data (BTC analysis and RSI provided by WebSocket)...');
      
      const [dxyData] = await Promise.allSettled([
        apiService.getDXYAnalysis()
      ]);

      console.log('ℹ️ Skipping redundant BTC analysis and RSI API calls - using WebSocket indicators instead');

      if (dxyData.status === 'fulfilled') {
        console.log('🔍 Fresh DXY API response:', dxyData.value);
        const dxyProcessed = dxyData.value?.success && dxyData.value?.data ? dxyData.value.data : dxyData.value;
        
        setMarketData(prev => {
          // Check if DXY data has actually changed
          const prevDXY = prev.dxyData || prev.dxy;
          const hasChanged = JSON.stringify(prevDXY) !== JSON.stringify(dxyProcessed);
          
          if (hasChanged) {
            console.log('💫 Triggering DXY enhanced pulse animation for fresh data');
            
            setPulseEffects(prev => ({
              ...prev,
              dxyChart: {
                active: true,
                type: 'api_fresh',
                intensity: 'normal',
                timestamp: Date.now(),
                source: 'DXY API'
              }
            }));
            
            setTimeout(() => {
              setPulseEffects(prev => ({
                ...prev,
                dxyChart: { ...prev.dxyChart, active: false }
              }));
            }, 2500);
            
            // Legacy support
            setDataUpdated(prevState => ({ ...prevState, dxy: true }));
            setTimeout(() => setDataUpdated(prevState => ({ ...prevState, dxy: false })), 2000);
          }
          
          return {
            ...prev,
            dxyData: dxyProcessed,
            dxy: dxyProcessed // Keep both for backward compatibility
          };
        });
        console.log('✅ Fresh DXY data processed');
      } else {
        console.warn('⚠️ Fresh DXY data failed:', dxyData.reason);
      }

      // Step 4: Fetch fresh funding rates
      console.log('💰 Fetching fresh funding rates...');
      
      try {
        const fundingData = await apiService.getFundingRates();
        if (fundingData && fundingData.success && fundingData.data?.structured) {
          setMarketData(prev => {
            // Check if funding rates have changed
            const prevFunding = prev.fundingRates;
            const hasChanged = JSON.stringify(prevFunding) !== JSON.stringify(fundingData.data.structured);
            
            if (hasChanged) {
              console.log('💫 Triggering funding rates enhanced pulse animation');
              
              setPulseEffects(prev => ({
                ...prev,
                fundingRates: {
                  active: true,
                  type: 'api_fresh',
                  intensity: 'normal',
                  timestamp: Date.now(),
                  source: 'Funding Rates API'
                }
              }));
              
              setTimeout(() => {
                setPulseEffects(prev => ({
                  ...prev,
                  fundingRates: { ...prev.fundingRates, active: false }
                }));
              }, 2500);
              
              // Legacy support
              setDataUpdated(prevState => ({ ...prevState, funding: true }));
              setTimeout(() => setDataUpdated(prevState => ({ ...prevState, funding: false })), 2000);
            }
            
            return {
              ...prev,
              fundingRates: fundingData.data.structured
            };
          });
          console.log('✅ Fresh funding rates processed');
        }
      } catch (error) {
        console.warn('⚠️ Fresh funding rates failed, keeping cached data:', error);
      }

      // Step 5: Fetch fresh ETF data (slowest, load last)
      console.log('🏦 Fetching fresh ETF flow data (may take up to 60s)...');
      
      try {
        const etfData = await apiService.getETFFlows();
        console.log('🔍 Fresh ETF API response:', etfData);
        if (etfData) {
          // Handle both mock data format {btcFlows: [], ethFlows: []} and API format {flows: [...]}
          let processedETF = {};
          
          if (etfData.success && etfData.data) {
            // API format: {success: true, data: {flows: [...], summary: {...}}}
            if (etfData.data.flows && Array.isArray(etfData.data.flows)) {
              // Convert flows array to btcFlows/ethFlows structure
              processedETF.btcFlows = etfData.data.flows.map(flow => ({
                timestamp: flow.date,
                flow: flow.value || flow.netFlow || 0
              }));
            } else if (etfData.data.btcFlows) {
              processedETF = etfData.data;
            }
          } else if (etfData.btcFlows) {
            processedETF = etfData;
          }
          
          if (processedETF.btcFlows && processedETF.btcFlows.length > 0) {
            setMarketData(prev => {
              // Check if ETF data has changed
              const prevETF = prev.etfFlows;
              const hasChanged = JSON.stringify(prevETF) !== JSON.stringify(processedETF);
              
              if (hasChanged) {
                console.log('💫 Triggering ETF flows enhanced pulse animation');
                
                setPulseEffects(prev => ({
                  ...prev,
                  etfFlows: {
                    active: true,
                    type: 'api_fresh',
                    intensity: 'subtle', // ETF data updates are less frequent
                    timestamp: Date.now(),
                    source: 'ETF Flows API'
                  }
                }));
                
                setTimeout(() => {
                  setPulseEffects(prev => ({
                    ...prev,
                    etfFlows: { ...prev.etfFlows, active: false }
                  }));
                }, 3000); // Longer animation for less frequent updates
                
                // Legacy support
                setDataUpdated(prevState => ({ ...prevState, etf: true }));
                setTimeout(() => setDataUpdated(prevState => ({ ...prevState, etf: false })), 2000);
              }
              
              return {
                ...prev,
                etfFlows: processedETF
              };
            });
            console.log('✅ Fresh ETF flows processed');
          }
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

  // Load cached data first for most accurate display
  const loadCachedDataFirst = useCallback(async () => {
    try {
      console.log('💾 Loading cached data first for accuracy...');
      
      // Try to load recent cached data from all endpoints
      const cachedPromises = [
        apiService.getMultiCryptoAnalysis('BTC,ETH', '220D').catch(() => null),
        apiService.getDXYAnalysis('30D').catch(() => null),
        apiService.getFundingRates().catch(() => null),
        apiService.getETFFlows().catch(() => null),
      ];
      
      const [cachedCrypto, cachedDXY, cachedFunding, cachedETF] = await Promise.all(cachedPromises);
      
      // Start with mock data as base
      let initialData = await mockDataService.getAllMarketData();
      console.log('🎭 Mock data loaded as fallback base');
      
      // Overlay cached data where available
      if (cachedCrypto?.success && cachedCrypto.data) {
        console.log('💾 Found cached crypto data, overlaying...', cachedCrypto.source);
        Object.entries(cachedCrypto.data).forEach(([symbol, data]) => {
          if (data && typeof data === 'object' && 'currentPrice' in data) {
            const cryptoKey = symbol.toLowerCase() === 'btc' ? 'bitcoin' : 
                            symbol.toLowerCase() === 'eth' ? 'ethereum' : symbol.toLowerCase();
            
            initialData.cryptoPrices[cryptoKey] = {
              ...initialData.cryptoPrices[cryptoKey],
              price: data.currentPrice,
              change: data.priceChange24h || data.change24h || 0,
              historical: data.historical || initialData.cryptoPrices[cryptoKey]?.historical
            };
            
            // Update BTC chart data if available
            if (cryptoKey === 'bitcoin' && data.historical) {
              initialData.bitcoin = {
                ...initialData.bitcoin,
                historical: data.historical,
                rsi: data.rsi || initialData.bitcoin.rsi,
                movingAverages: data.movingAverages || initialData.bitcoin.movingAverages
              };
            }
          }
        });
      }
      
      if (cachedDXY?.success && cachedDXY.data) {
        console.log('💾 Found cached DXY data, overlaying...', cachedDXY.source);
        initialData.dxyData = {
          ...initialData.dxyData,
          ...cachedDXY.data
        };
      }
      
      if (cachedFunding?.success && cachedFunding.data?.structured) {
        console.log('💾 Found cached funding rates, overlaying...', cachedFunding.source);
        initialData.fundingRates = cachedFunding.data.structured;
      }
      
      if (cachedETF?.success || (cachedETF && !cachedETF.success)) {
        console.log('💾 Found cached ETF data, overlaying...', cachedETF?.source || 'direct');
        const etfData = cachedETF?.data || cachedETF;
        if (etfData?.flows || etfData?.btcFlows) {
          initialData.etfFlows = etfData.flows ? {
            btcFlows: etfData.flows.map(flow => ({
              timestamp: flow.date,
              flow: flow.value || flow.netFlow || 0
            }))
          } : etfData;
        }
      }
      
      console.log('💾 Cached data overlaying complete - showing most accurate available data');
      setMarketData(initialData);
      return initialData;
      
    } catch (error) {
      console.warn('⚠️ Failed to load cached data, using pure mock:', error);
      const mockData = await mockDataService.getAllMarketData();
      setMarketData(mockData);
      return mockData;
    }
  }, []);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // INTELLIGENT TIERED LOADING FOR SUB-3-SECOND PERFORMANCE:
      console.log('🚀 Starting Intelligent Tiered Loading System...');
      
      // Use intelligent cache service with progressive enhancement callbacks
      await intelligentCacheService.getMarketDataIntelligent({
        // Tier 1: Golden Dataset - Instant UI (Target: <100ms)
        onTier1Complete: (data, meta) => {
          console.log(`✅ TIER 1 (${meta.quality}): UI ready in ${meta.loadTime.toFixed(1)}ms`);
          setMarketData(data);
          setLoading(false); // UI is immediately interactive
          
          // Trigger subtle pulse to indicate data freshness
          setPulseEffects(prev => ({
            ...prev,
            priceCards: { 
              active: true, 
              type: meta.quality === 'golden' ? 'golden_data' : 'mock_data', 
              intensity: 'subtle',
              timestamp: Date.now()
            }
          }));
          setTimeout(() => setPulseEffects(prev => ({...prev, priceCards: { ...prev.priceCards, active: false }})), 1500);
        },
        
        // Tier 2: Cached Real Data - Enhanced accuracy (Target: <500ms)
        onTier2Complete: (data, meta) => {
          console.log(`📈 TIER 2 (${meta.quality}): Enhanced data in ${meta.loadTime.toFixed(1)}ms`);
          setMarketData(data);
          
          // Stronger pulse for real cached data
          setPulseEffects(prev => ({
            ...prev,
            priceCards: { 
              active: true, 
              type: 'cached_real_data', 
              intensity: 'normal',
              timestamp: Date.now()
            }
          }));
          setTimeout(() => setPulseEffects(prev => ({...prev, priceCards: { ...prev.priceCards, active: false }})), 2000);
        },
        
        // Tier 3: Fresh API Data - Maximum accuracy (Target: <3000ms)  
        onTier3Complete: (data, meta) => {
          console.log(`🎯 TIER 3 (${meta.quality}): Fresh data in ${meta.loadTime.toFixed(1)}ms`);
          setMarketData(data);
          
          // Strongest pulse for fresh API data
          setPulseEffects(prev => ({
            ...prev,
            priceCards: { 
              active: true, 
              type: 'fresh_api_data', 
              intensity: 'strong',
              timestamp: Date.now()
            }
          }));
          setTimeout(() => setPulseEffects(prev => ({...prev, priceCards: { ...prev.priceCards, active: false }})), 3000);
          
          // Update persistent mock service with fresh patterns  
          if (data && typeof persistentMockService.updateWithRealData === 'function') {
            persistentMockService.updateWithRealData(data);
          }
        },
        
        enableProgressiveLoading: useRealAPI
      });
      
      // Get performance statistics
      const perfStats = intelligentCacheService.getPerformanceStats();
      console.log('📊 Loading Performance:', perfStats);
      
    } catch (err) {
      console.error('❌ Critical error in intelligent cache loading:', err);
      
      // ULTIMATE FALLBACK: Traditional mock data if everything fails
      try {
        console.log('🚨 ULTIMATE FALLBACK: Loading traditional mock data...');
        const fallbackData = await mockDataService.getAllMarketData();
        setMarketData(fallbackData);
        setLoading(false);
        setError('Using offline data - some features may be limited');
      } catch (fallbackErr) {
        setError(`Critical system failure: ${err.message}`);
        setLoading(false);
      }
    }
  }, [useRealAPI]);

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

  // Enhanced Bitcoin chart with Moving Averages and Bollinger Bands - Professional Trader Grade
  const getBitcoinChartOptions = () => {
    // FIX: Check both possible data paths - historical (from API) and prices (legacy)
    const priceData = marketData?.bitcoin?.historical || marketData?.bitcoin?.prices;
    if (!priceData || !Array.isArray(priceData)) {
      return {
        series: [],
        options: getLoadingOptions('BTC Price with Technical Analysis')
      };
    }

    // Safely filter and map price data to prevent ApexCharts path errors
    const validPrices = priceData
      .filter(item => item && item.timestamp && typeof item.price === 'number' && !isNaN(item.price))
      .map(item => {
        const timestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime();
        return [timestamp, Math.round(item.price)];
      })
      .filter(([timestamp, price]) => !isNaN(timestamp) && !isNaN(price));

    if (validPrices.length === 0) {
      return {
        series: [],
        options: getLoadingOptions('BTC Price with Technical Analysis')
      };
    }

    const series = [
      {
        name: 'BTC Price',
        type: 'area',
        data: validPrices
      }
    ];

    // Add Bollinger Bands first (background indicators)
    if (marketData.bitcoin.bollingerBands && marketData.bitcoin.bollingerBands[20]) {
      const bb = marketData.bitcoin.bollingerBands[20];
      
      // Upper Band
      if (bb.upper && bb.upper.length > 0) {
        const validUpperBB = bb.upper
          .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
          .map(item => {
            const timestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime();
            return [timestamp, Math.round(item.value)];
          })
          .filter(([timestamp, value]) => !isNaN(timestamp) && !isNaN(value));

        if (validUpperBB.length > 0) {
          series.push({
            name: 'BB Upper (20,2)',
            type: 'line',
            data: validUpperBB,
            stroke: {
              width: 1,
              dashArray: 2,
              opacity: 0.7
            },
            fill: { opacity: 0 },
            showInLegend: true,
            visible: false // Hide by default
          });
        }
      }

      // Lower Band  
      if (bb.lower && bb.lower.length > 0) {
        const validLowerBB = bb.lower
          .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
          .map(item => {
            const timestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime();
            return [timestamp, Math.round(item.value)];
          })
          .filter(([timestamp, value]) => !isNaN(timestamp) && !isNaN(value));

        if (validLowerBB.length > 0) {
          series.push({
            name: 'BB Lower (20,2)',
            type: 'line',
            data: validLowerBB,
            stroke: {
              width: 1,
              dashArray: 2,
              opacity: 0.7
            },
            fill: { opacity: 0 },
            showInLegend: true,
            visible: false // Hide by default
          });
        }
      }

      // Middle Band (20-day SMA)
      if (bb.middle && bb.middle.length > 0) {
        const validMiddleBB = bb.middle
          .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
          .map(item => {
            const timestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime();
            return [timestamp, Math.round(item.value)];
          })
          .filter(([timestamp, value]) => !isNaN(timestamp) && !isNaN(value));

        if (validMiddleBB.length > 0) {
          series.push({
            name: 'BB Middle (20d SMA)',
            type: 'line',
            data: validMiddleBB,
            stroke: {
              width: 1.5,
              dashArray: 3
            },
            fill: { opacity: 0 },
            showInLegend: true,
            visible: false // Hide by default
          });
        }
      }
    }

    // Add moving averages with distinct styles - with data validation
    const maPeriods = [50, 100, 200]; // Skip 20-day as it's included in BB middle
    maPeriods.forEach((period) => {
      if (marketData.bitcoin.movingAverages && marketData.bitcoin.movingAverages[period]) {
        const validMAData = marketData.bitcoin.movingAverages[period]
          .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
          .map(item => {
            const timestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime();
            return [timestamp, Math.round(item.value)];
          })
          .filter(([timestamp, value]) => !isNaN(timestamp) && !isNaN(value));

        if (validMAData.length > 0) {
          series.push({
            name: `${period}d MA`,
            type: 'line',
            data: validMAData,
            stroke: {
              width: 1.5 // All MAs have 1.5px width
            },
            fill: { opacity: 0 } // No area fill for MAs
          });
        }
      }
    });

    return {
      series,
      options: {
        chart: {
          id: 'btc-chart',
          height: 400,
          type: 'line',
          background: '#000000',
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
        colors: [
          '#FBBF24', // BTC Price (yellow)
          '#9CA3AF', // BB Upper (gray)
          '#9CA3AF', // BB Lower (gray)
          '#6B7280', // BB Middle (darker gray)
          '#10B981', // 50d MA (green)
          '#EF4444', // 100d MA (red)
          '#38BDF8'  // 200d MA (light blue)
        ],
        stroke: {
          curve: 'smooth',
          width: [2, 1, 1, 1.5, 1.5, 1.5, 1.5] // BTC: 2px, BB: 1px, MAs: 1.5px
        },
        fill: {
          type: ['gradient', 'solid', 'solid', 'solid', 'solid', 'solid', 'solid'], // Gradient only for BTC area
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 1,
            gradientToColors: ['rgba(251, 191, 36, 0.05)'],
            inverseColors: false,
            opacityFrom: 0.4,
            opacityTo: 0.05,
            stops: [0, 100]
          }
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
          markers: { width: 12, height: 12 },
          showForSingleSeries: false,
          itemMargin: { horizontal: 8, vertical: 0 }
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
  // Check for different data structures: mock data has .prices, API response has .historical
  const dxyPrices = marketData?.dxy?.prices || 
                    marketData?.dxy?.historical || 
                    marketData?.dxyData?.prices || 
                    marketData?.dxyData?.historical;
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

  // Safely filter and map DXY data to prevent ApexCharts path errors
  const validDxyData = dxyPrices
    .filter(item => item && (item.timestamp || item.date) && (typeof item.price === 'number' || typeof item.value === 'number'))
    .map(item => {
      const timestamp = new Date(item.timestamp || item.date).getTime();
      const price = item.price || item.value;
      return [timestamp, price];
    })
    .filter(([timestamp, price]) => !isNaN(timestamp) && !isNaN(price));

  if (validDxyData.length === 0) {
    return {
      series: [],
      options: {
        ...getLoadingOptions('US Dollar Index (DXY)'),
        chart: {
          ...getLoadingOptions('US Dollar Index (DXY)').chart,
          height: 200,
          type: 'area'
        }
      }
    };
  }

  return {
    series: [{
      name: 'DXY',
      data: validDxyData
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

    // Safely filter and map ETF data to prevent ApexCharts errors
    const validETFData = btcFlows
      .filter(item => {
        const hasTimestamp = item && (item.timestamp || item.date);
        const hasValue = typeof (item.flow || item.value || item.amount) === 'number';
        return hasTimestamp && hasValue;
      })
      .map(item => {
        const timestamp = new Date(item.timestamp || item.date).getTime();
        const value = Math.round((item.flow || item.value || item.amount) / 1000000); // Convert to millions
        return { x: timestamp, y: value };
      })
      .filter(item => !isNaN(item.x) && !isNaN(item.y));

    if (validETFData.length === 0) {
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

    const btcData = validETFData;

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
            columnWidth: '80%',
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
              fontSize: '10px'
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

  // Volume Analysis Card Component 
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


  // Enhanced Price Cards with Live WebSocket Updates
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
pulseEffects.priceCards.active ? 'animate-pulse ring-4 ring-[#fbc318]/50 shadow-2xl shadow-[#fbc318]/30' : ''
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
pulseEffects.priceCards.active ? 'animate-pulse ring-4 ring-blue-500/50 shadow-2xl shadow-blue-500/30' : ''
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
pulseEffects.priceCards.active ? 'animate-pulse ring-4 ring-purple-500/50 shadow-2xl shadow-purple-500/30' : ''
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
                <h3 className={`text-lg font-semibold ${colors.text.primary}`}>BTC Technical Analysis</h3>
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
                  rsiData={marketData?.bitcoin?.rsi}
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
                  rsiData={marketData?.ethereum?.rsi}
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
            {(() => {
              const dxyValue = marketData?.dxyData?.currentPrice || marketData?.dxy?.currentPrice || marketData?.dxy?.current?.value;
              return typeof dxyValue === 'number' && !isNaN(dxyValue) ? dxyValue.toFixed(2) : '102.61';
            })()}
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
              ⚡ Live data powered by CoinGecko | WebSocket: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span> | Ring animations show fresh updates
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