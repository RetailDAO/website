// Mock Data Service for UI Testing
// Contains comprehensive mock data including RSI for 14d, 21d, and 30d periods

class MockDataService {
  constructor() {
    this.mockData = this.generateMockData();
  }

  generateMockData() {
    const now = new Date();
    const days = 220; // Generate 220 days of data for enhanced chart
    
    // Generate time series data
    const timeSeriesData = this.generateTimeSeriesData(now, days);
    
    return {
      bitcoin: {
        currentPrice: 110307.00,
        priceChange24h: 2450.50,
        priceChangePercent24h: 2.27,
        marketCap: 2185000000000,
        volume24h: 45800000000,
        source: 'Mock Data',
        prices: timeSeriesData.btcPrices,
        volumes: timeSeriesData.btcVolumes,
        movingAverages: {
          20: timeSeriesData.ma20,
          50: timeSeriesData.ma50,
          100: timeSeriesData.ma100,
          200: timeSeriesData.ma200
        },
        rsi: {
          14: timeSeriesData.rsi14,
          21: timeSeriesData.rsi21,
          30: timeSeriesData.rsi30
        }
      },
      ethereum: {
        currentPrice: 4393.31,
        priceChange24h: 127.84,
        priceChangePercent24h: 3.00,
        marketCap: 528600000000,
        volume24h: 28500000000,
        source: 'Mock Data',
        prices: timeSeriesData.ethPrices,
        volumes: timeSeriesData.ethVolumes,
        rsi: {
          14: timeSeriesData.rsi14,
          21: timeSeriesData.rsi21,
          30: timeSeriesData.rsi30
        }
      },
      solana: {
        currentPrice: 204.09,
        priceChange24h: 8.45,
        priceChangePercent24h: 4.32,
        marketCap: 96800000000,
        volume24h: 4200000000,
        source: 'Mock Data',
        prices: timeSeriesData.solPrices,
        volumes: timeSeriesData.solVolumes
      },
      retail: {
        currentPrice: 0.0245,
        priceChange24h: -0.0006,
        priceChangePercent24h: -2.34,
        marketCap: 24500000,
        volume24h: 125000,
        source: 'Mock Data (Base Network)',
        contract: '0xc7167e360bD63696a7870C0Ef66939E882249F20',
        platform: 'base'
      },
      dxy: {
        currentPrice: 104.25,
        source: 'Mock Data',
        prices: timeSeriesData.dxyPrices
      },
      etfFlows: {
        btcFlows: timeSeriesData.btcETFFlows,
        ethFlows: timeSeriesData.ethETFFlows
      },
      fundingRates: {
        btc: {
          rate: 0.0008,
          trend: 'bullish',
          exchanges: [
            { name: 'Binance', rate: 0.0008 },
            { name: 'Bybit', rate: 0.0012 },
            { name: 'OKX', rate: 0.0006 }
          ]
        },
        eth: {
          rate: 0.0015,
          trend: 'bullish',
          exchanges: [
            { name: 'Binance', rate: 0.0015 },
            { name: 'Bybit', rate: 0.0018 },
            { name: 'OKX', rate: 0.0012 }
          ]
        }
      }
    };
  }

  generateTimeSeriesData(endDate, days) {
    const data = {
      btcPrices: [],
      btcVolumes: [],
      ethPrices: [],
      ethVolumes: [],
      solPrices: [],
      solVolumes: [],
      dxyPrices: [],
      ma20: [],
      ma50: [],
      ma100: [],
      ma200: [],
      rsi14: [],
      rsi21: [],
      rsi30: [],
      btcETFFlows: [],
      ethETFFlows: []
    };

    // Base values
    let btcPrice = 45000;
    let ethPrice = 2000;
    let solPrice = 80; // Starting from lower base to reach current 204
    let dxyPrice = 102;
    
    // Generate daily data points
    for (let i = days; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      // BTC Price with trend and volatility
      const trendFactor = 1 + (Math.sin(i * 0.1) * 0.1);
      const volatility = (Math.random() - 0.5) * 0.08;
      btcPrice = btcPrice * (1 + volatility) * trendFactor;
      
      // ETH Price with correlation to BTC but own volatility
      const ethCorrelation = 0.7; // 70% correlation with BTC
      const ethVolatility = (Math.random() - 0.5) * 0.06;
      const ethTrend = 1 + (Math.sin(i * 0.12) * 0.08);
      ethPrice = ethPrice * (1 + (volatility * ethCorrelation) + ethVolatility) * ethTrend;
      
      // SOL Price with moderate correlation to ETH and higher volatility
      const solCorrelation = 0.5; // 50% correlation with BTC
      const solVolatility = (Math.random() - 0.5) * 0.10; // Higher volatility
      const solTrend = 1 + (Math.sin(i * 0.15) * 0.12); // Different trend cycle
      solPrice = solPrice * (1 + (volatility * solCorrelation) + solVolatility) * solTrend;
      
      // DXY Price with smaller volatility
      const dxyVolatility = (Math.random() - 0.5) * 0.02;
      dxyPrice = dxyPrice * (1 + dxyVolatility);
      
      // Generate volumes (higher volume = more volatility)
      const btcBaseVolume = 25000000000;
      const btcVolumeVariation = (Math.random() * 0.6 + 0.7); // 70% to 130% of base
      const btcVolume = btcBaseVolume * btcVolumeVariation;
      
      const ethBaseVolume = 12000000000;
      const ethVolumeVariation = (Math.random() * 0.8 + 0.6); // 60% to 140% of base
      const ethVolume = ethBaseVolume * ethVolumeVariation;
      
      const solBaseVolume = 3500000000;
      const solVolumeVariation = (Math.random() * 1.0 + 0.5); // 50% to 150% of base
      const solVolume = solBaseVolume * solVolumeVariation;
      
      // Add price and volume data
      data.btcPrices.push({
        timestamp: new Date(date),
        price: btcPrice
      });
      
      data.btcVolumes.push({
        timestamp: new Date(date),
        volume: btcVolume
      });
      
      data.ethPrices.push({
        timestamp: new Date(date),
        price: ethPrice
      });
      
      data.ethVolumes.push({
        timestamp: new Date(date),
        volume: ethVolume
      });
      
      data.solPrices.push({
        timestamp: new Date(date),
        price: solPrice
      });
      
      data.solVolumes.push({
        timestamp: new Date(date),
        volume: solVolume
      });
      
      data.dxyPrices.push({
        timestamp: new Date(date),
        price: dxyPrice
      });

      // Calculate moving averages (simplified)
      if (i <= days - 20) {
        const ma20Value = this.calculateMA(data.btcPrices.slice(-20), 'price');
        data.ma20.push({
          timestamp: new Date(date),
          value: ma20Value
        });
      }

      if (i <= days - 50) {
        const ma50Value = this.calculateMA(data.btcPrices.slice(-50), 'price');
        data.ma50.push({
          timestamp: new Date(date),
          value: ma50Value
        });
      }

      if (i <= days - 100) {
        const ma100Value = this.calculateMA(data.btcPrices.slice(-100), 'price');
        data.ma100.push({
          timestamp: new Date(date),
          value: ma100Value
        });
      }

      // Calculate RSI values
      if (i <= days - 14) {
        const rsi14Value = this.calculateRSI(data.btcPrices.slice(-15), 14);
        data.rsi14.push({
          timestamp: new Date(date),
          value: rsi14Value,
          period: 14
        });
      }

      if (i <= days - 21) {
        const rsi21Value = this.calculateRSI(data.btcPrices.slice(-22), 21);
        data.rsi21.push({
          timestamp: new Date(date),
          value: rsi21Value,
          period: 21
        });
      }

      if (i <= days - 30) {
        const rsi30Value = this.calculateRSI(data.btcPrices.slice(-31), 30);
        data.rsi30.push({
          timestamp: new Date(date),
          value: rsi30Value,
          period: 30
        });
      }

      // ETF Flows (random flows between -500M to +300M for BTC)
      const btcFlow = (Math.random() - 0.6) * 800000000; // Bias towards outflows
      const ethFlow = (Math.random() - 0.5) * 100000000;
      
      data.btcETFFlows.push({
        timestamp: new Date(date),
        flow: btcFlow
      });

      data.ethETFFlows.push({
        timestamp: new Date(date),
        flow: ethFlow
      });
    }

    // Add 200MA for recent data only
    const recent200 = data.btcPrices.slice(-200);
    if (recent200.length === 200) {
      data.ma200.push({
        timestamp: recent200[recent200.length - 1].timestamp,
        value: this.calculateMA(recent200, 'price')
      });
    }

    return data;
  }

  calculateMA(dataArray, field) {
    if (!dataArray.length) return 0;
    const sum = dataArray.reduce((acc, item) => acc + item[field], 0);
    return sum / dataArray.length;
  }

  calculateRSI(priceArray, period = 14) {
    if (!priceArray || priceArray.length < period + 1) {
      return 50; // Default neutral RSI
    }

    let gains = 0;
    let losses = 0;

    // Calculate price changes
    for (let i = 1; i < priceArray.length; i++) {
      const change = priceArray[i].price - priceArray[i - 1].price;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    // Calculate average gains and losses
    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 10;
    const finalRSI = Math.max(0, Math.min(100, rsi + variation));

    return parseFloat(finalRSI.toFixed(1));
  }

  // Main method to get all market data
  async getAllMarketData() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add some real-time variation to current prices
    const variation = (Math.random() - 0.5) * 0.02;
    this.mockData.bitcoin.currentPrice *= (1 + variation);
    
    return this.mockData;
  }

  // Individual data methods (matching API service interface)
  async getBTCPrice() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      data: {
        price: this.mockData.bitcoin.currentPrice,
        timestamp: new Date()
      }
    };
  }

  async getBTCAnalysis() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: {
        prices: this.mockData.bitcoin.prices,
        movingAverages: this.mockData.bitcoin.movingAverages,
        currentPrice: this.mockData.bitcoin.currentPrice
      }
    };
  }

  async getDXYAnalysis() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: {
        prices: this.mockData.dxy.prices,
        currentPrice: this.mockData.dxy.currentPrice
      }
    };
  }

  async getETFFlows() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: {
        btcFlows: this.mockData.etfFlows.btcFlows,
        ethFlows: this.mockData.etfFlows.ethFlows
      }
    };
  }

  async getRSI() {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const rsiData = this.mockData.bitcoin.rsi[14];
    
    return {
      success: true,
      data: {
        rsi: rsiData,
        currentRSI: rsiData[rsiData.length - 1]?.value || 50,
        period: 14
      }
    };
  }

  async getFundingRates(symbol = 'BTC') {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const symbolData = symbol.toLowerCase() === 'eth' 
      ? this.mockData.fundingRates.eth 
      : this.mockData.fundingRates.btc;
    
    return {
      success: true,
      data: symbolData
    };
  }

  // ETH specific methods
  async getETHPrice() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      data: {
        price: this.mockData.ethereum.currentPrice,
        priceChange24h: this.mockData.ethereum.priceChange24h,
        priceChangePercent24h: this.mockData.ethereum.priceChangePercent24h,
        timestamp: new Date()
      }
    };
  }

  async getETHAnalysis() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: {
        prices: this.mockData.ethereum.prices,
        volumes: this.mockData.ethereum.volumes,
        currentPrice: this.mockData.ethereum.currentPrice
      }
    };
  }

  // RETAIL token methods
  async getRetailPrice() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      data: {
        price: this.mockData.retail.currentPrice,
        priceChange24h: this.mockData.retail.priceChange24h,
        priceChangePercent24h: this.mockData.retail.priceChangePercent24h,
        contract: this.mockData.retail.contract,
        platform: this.mockData.retail.platform,
        timestamp: new Date()
      }
    };
  }

  // Utility method to generate fresh RSI data with different characteristics
  generateRSIScenario(scenario = 'normal') {
    const scenarios = {
      'overbought': () => 70 + Math.random() * 25, // 70-95 range
      'oversold': () => 5 + Math.random() * 25,    // 5-30 range  
      'normal': () => 35 + Math.random() * 30,     // 35-65 range
      'volatile': () => Math.random() * 100        // 0-100 range
    };

    const rsiGenerator = scenarios[scenario] || scenarios['normal'];
    
    // Update current RSI values for all periods for both BTC and ETH
    const periods = [14, 21, 30];
    const coins = ['bitcoin', 'ethereum'];
    
    coins.forEach(coin => {
      periods.forEach(period => {
        if (this.mockData[coin].rsi[period] && this.mockData[coin].rsi[period].length > 0) {
          const lastRSI = this.mockData[coin].rsi[period][this.mockData[coin].rsi[period].length - 1];
          lastRSI.value = parseFloat(rsiGenerator().toFixed(1));
        }
      });
    });

    console.log(`🎭 [Mock] Generated RSI scenario: ${scenario} - BTC 14d RSI: ${this.mockData.bitcoin.rsi[14][this.mockData.bitcoin.rsi[14].length - 1]?.value}`);
    
    return {
      bitcoin: this.mockData.bitcoin.rsi,
      ethereum: this.mockData.ethereum.rsi
    };
  }
}

// Create singleton instance
const mockDataService = new MockDataService();

export default mockDataService;

// Export individual methods for easier importing
export const {
  getAllMarketData,
  getBTCPrice,
  getBTCAnalysis,
  getDXYAnalysis,
  getETFFlows,
  getRSI,
  getFundingRates,
} = mockDataService;