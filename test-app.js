#!/usr/bin/env node

/**
 * Quick Test Script for RD Crypto Dashboard
 * Tests the key functionality implemented in the optimization
 */

const axios = require('axios');
const WebSocket = require('ws');

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/prices';

console.log('🚀 Testing RD Crypto Dashboard Implementation');
console.log('=' .repeat(50));

async function testAPI() {
  console.log('\n📡 Testing API Endpoints...');
  
  const endpoints = [
    { name: 'Health Check', url: '/api/health' },
    { name: 'BTC Current Price', url: '/api/btc/current' },
    { name: 'BTC Analysis', url: '/api/btc/analysis?timeframe=7D' },
    { name: 'BTC MA Ribbon', url: '/api/btc/ma-ribbon?timeframe=7D&symbol=BTC' },
    { name: 'DXY Analysis', url: '/api/dxy/analysis?timeframe=30D' },
    { name: 'Funding Rates', url: '/api/funding/rates?symbol=BTC' },
    { name: 'RSI Indicators', url: '/api/rsi/bulk?symbols=BTC,ETH&periods=14,21,30' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE}${endpoint.url}`, { timeout: 5000 });
      console.log(`✅ ${endpoint.name}: ${response.status} - ${response.data.success ? 'Success' : 'Failed'}`);
      
      // Show sample data for key endpoints
      if (endpoint.name === 'Health Check') {
        console.log(`   Uptime: ${Math.floor((response.data.uptime || 0) / 60)}m`);
      }
      if (endpoint.name === 'BTC Current Price' && response.data.data) {
        console.log(`   BTC Price: $${(response.data.data.currentPrice || 0).toLocaleString()}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.message}`);
    }
  }
}

function testWebSocket() {
  console.log('\n🔌 Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let messageCount = 0;
    let startTime = Date.now();

    ws.on('open', () => {
      console.log('✅ WebSocket Connected');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageCount++;
        
        if (message.type === 'connection') {
          console.log(`📞 Connection Message: ${message.status}`);
        } else if (message.type === 'price_update') {
          console.log(`📈 Price Update: ${message.symbol} = $${message.price?.toLocaleString()} (${message.change24h > 0 ? '+' : ''}${message.change24h?.toFixed(2)}%)`);
        }

        // Close after receiving a few messages or 10 seconds
        if (messageCount >= 3 || Date.now() - startTime > 10000) {
          ws.close();
        }
      } catch (error) {
        console.log(`⚠️ WebSocket parse error: ${error.message}`);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WebSocket Closed (received ${messageCount} messages)`);
      resolve();
    });

    ws.on('error', (error) => {
      console.log(`❌ WebSocket Error: ${error.message}`);
      resolve();
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve();
    }, 15000);
  });
}

async function testCachePerformance() {
  console.log('\n⚡ Testing Cache Performance...');
  
  const testUrl = `${API_BASE}/api/btc/current`;
  
  // First request (cold cache)
  const start1 = Date.now();
  try {
    await axios.get(testUrl);
    const time1 = Date.now() - start1;
    console.log(`📊 Cold cache request: ${time1}ms`);
    
    // Second request (warm cache)
    const start2 = Date.now();
    await axios.get(testUrl);
    const time2 = Date.now() - start2;
    console.log(`🔥 Warm cache request: ${time2}ms`);
    
    const improvement = Math.round(((time1 - time2) / time1) * 100);
    console.log(`⚡ Cache improvement: ${improvement > 0 ? improvement : 0}%`);
    
  } catch (error) {
    console.log(`❌ Cache test failed: ${error.message}`);
  }
}

async function main() {
  try {
    await testAPI();
    await testWebSocket();
    await testCachePerformance();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ API endpoints tested');
    console.log('✅ WebSocket real-time updates tested');
    console.log('✅ Cache performance tested');
    console.log('\n🌐 Frontend: http://localhost:3000');
    console.log('🔧 Backend API: http://localhost:8000');
    console.log('📡 WebSocket: ws://localhost:8000/ws/prices');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}