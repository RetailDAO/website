const WebSocket = require('ws');

// Test script to check Finnhub WebSocket DXY availability
// You'll need a Finnhub API key from https://finnhub.io/register

const FINNHUB_API_KEY = 'your_api_key_here'; // Replace with actual key
const WEBSOCKET_URL = `wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`;

// Common DXY symbol variations to test
const DXY_SYMBOLS_TO_TEST = [
  'DXY',           // Direct symbol
  'OANDA:DXY',     // OANDA exchange format
  'IC MARKETS:DXY', // IC Markets format
  'DX-Y.NYB',      // Yahoo Finance format
  'TVC:DXY',       // TradingView format
  'USDINDEX',      // Alternative naming
  'DXY.FOREX',     // Forex suffix
  'FOREX:DXY',     // Forex prefix
];

class FinnhubDXYTester {
  constructor() {
    this.ws = null;
    this.testResults = {};
    this.connectionTimeout = null;
  }

  async testDXYAvailability() {
    console.log('🔍 Testing Finnhub WebSocket DXY availability...');
    console.log('📝 Symbols to test:', DXY_SYMBOLS_TO_TEST);
    
    if (FINNHUB_API_KEY === 'your_api_key_here') {
      console.log('❌ Please provide a valid Finnhub API key in the script');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WEBSOCKET_URL);
        
        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          console.log('⏱️ Connection timeout after 10 seconds');
          this.ws.close();
          resolve(this.testResults);
        }, 10000);

        this.ws.on('open', () => {
          console.log('✅ Connected to Finnhub WebSocket');
          this.subscribeToSymbols();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          clearTimeout(this.connectionTimeout);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('🔌 WebSocket connection closed');
          clearTimeout(this.connectionTimeout);
          resolve(this.testResults);
        });

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error.message);
        reject(error);
      }
    });
  }

  subscribeToSymbols() {
    console.log('📡 Subscribing to DXY symbol variants...');
    
    DXY_SYMBOLS_TO_TEST.forEach((symbol, index) => {
      setTimeout(() => {
        const subscribeMessage = {
          type: 'subscribe',
          symbol: symbol
        };
        
        console.log(`📤 Testing symbol: ${symbol}`);
        this.ws.send(JSON.stringify(subscribeMessage));
        
        // Initialize result tracking
        this.testResults[symbol] = {
          subscribed: true,
          dataReceived: false,
          sampleData: null,
          error: null
        };
      }, index * 500); // Stagger subscriptions
    });

    // Wait for data, then close connection
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('🏁 Test completed, closing connection...');
        this.ws.close();
      }
    }, 8000);
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'trade') {
        console.log('📊 Received trade data:', {
          type: message.type,
          data: message.data?.slice(0, 2) // Show first 2 items
        });

        // Check if this is DXY data
        message.data?.forEach(trade => {
          const symbol = trade.s;
          if (this.testResults[symbol]) {
            this.testResults[symbol].dataReceived = true;
            this.testResults[symbol].sampleData = {
              price: trade.p,
              timestamp: trade.t,
              volume: trade.v
            };
            console.log(`✅ DXY data found for symbol ${symbol}:`, {
              price: trade.p,
              timestamp: new Date(trade.t).toISOString(),
              volume: trade.v
            });
          }
        });
      } else if (message.type === 'ping') {
        // Respond to ping to keep connection alive
        this.ws.send(JSON.stringify({ type: 'pong' }));
      } else {
        console.log('📨 Other message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error.message);
    }
  }

  printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('='.repeat(50));
    
    let foundValidSymbol = false;
    
    Object.entries(this.testResults).forEach(([symbol, result]) => {
      const status = result.dataReceived ? '✅ SUCCESS' : '❌ NO DATA';
      console.log(`${status} ${symbol}${result.sampleData ? ` - Price: ${result.sampleData.price}` : ''}`);
      
      if (result.dataReceived) {
        foundValidSymbol = true;
        console.log(`   📊 Sample: Price=${result.sampleData.price}, Volume=${result.sampleData.volume}`);
      }
    });
    
    if (foundValidSymbol) {
      console.log('\n🎉 DXY data is available through Finnhub WebSocket!');
    } else {
      console.log('\n❌ No valid DXY symbol found in tested variations');
      console.log('💡 Recommendations:');
      console.log('   - Check Finnhub forex symbols endpoint: GET /forex/symbol');
      console.log('   - Contact Finnhub support for DXY availability');
      console.log('   - Consider using major USD pairs as DXY proxy');
    }
  }
}

// Additional function to check forex symbols via REST API
async function checkForexSymbols() {
  console.log('\n🔍 Checking available forex symbols...');
  
  try {
    // This would require the axios or fetch library
    console.log('💡 To check available symbols, use:');
    console.log(`GET https://finnhub.io/api/v1/forex/symbol?exchange=oanda&token=${FINNHUB_API_KEY}`);
  } catch (error) {
    console.error('❌ Error checking forex symbols:', error.message);
  }
}

// Usage instructions
console.log('Finnhub DXY Availability Tester');
console.log('================================');
console.log('');
console.log('Instructions:');
console.log('1. Get a free API key from https://finnhub.io/register');
console.log('2. Replace FINNHUB_API_KEY in this script');
console.log('3. Install dependencies: npm install ws');
console.log('4. Run: node test-finnhub-dxy.js');
console.log('');

// Run the test (uncomment when API key is provided)
if (FINNHUB_API_KEY !== 'your_api_key_here') {
  const tester = new FinnhubDXYTester();
  tester.testDXYAvailability()
    .then(() => {
      tester.printResults();
      checkForexSymbols();
    })
    .catch(error => {
      console.error('Test failed:', error.message);
    });
} else {
  console.log('⚠️  Please provide a Finnhub API key to run the test');
}