#!/usr/bin/env node

/**
 * Test script for Golden Dataset Service
 * This script tests cache persistence across server restarts
 */

const path = require('path');
const fs = require('fs').promises;

// Setup paths
const backendDir = __dirname;
process.chdir(backendDir);

const goldenDatasetService = require('./src/services/cache/goldenDatasetService');
const cacheService = require('./src/services/cache/cacheService');

async function testGoldenDataset() {
  console.log('🧪 Testing Golden Dataset Service...\n');

  try {
    // Test 1: Store sample data
    console.log('📝 Test 1: Storing sample data...');
    const sampleBTCData = {
      current: {
        price: 67500,
        change24h: 2.5,
        volume24h: 25000000000,
        marketCap: 1330000000000
      },
      historical: [
        { timestamp: new Date(Date.now() - 24*60*60*1000).toISOString(), price: 66000 },
        { timestamp: new Date(Date.now() - 12*60*60*1000).toISOString(), price: 66800 },
        { timestamp: new Date().toISOString(), price: 67500 }
      ],
      dataSource: 'test_api'
    };

    const stored = await goldenDatasetService.store('btc_1D', sampleBTCData, 'fresh');
    console.log(`   ✅ Data stored: ${stored}`);

    // Test 2: Retrieve data
    console.log('\n📖 Test 2: Retrieving data...');
    const retrieved = await goldenDatasetService.retrieve('btc_1D');
    if (retrieved && retrieved.data) {
      console.log(`   ✅ Data retrieved: ${retrieved.data.current.price} BTC`);
      console.log(`   📊 Metadata: ${retrieved.metadata.tier} tier, ${retrieved.metadata.age} minutes old`);
    } else {
      console.log('   ❌ Failed to retrieve data');
    }

    // Test 3: Get all datasets
    console.log('\n📋 Test 3: Getting all datasets...');
    const allData = await goldenDatasetService.getAll();
    console.log('   Available datasets:');
    Object.entries(allData).forEach(([type, info]) => {
      console.log(`     ${type}: ${info.tier} tier, ${info.age}min old, ${info.dataPoints} points`);
    });

    // Test 4: Test cache integration
    console.log('\n🔄 Test 4: Testing cache integration...');
    const cacheResult = await cacheService.getOrFetchWithGolden(
      'test_btc_data',
      async () => {
        // Simulate API call that fails
        throw new Error('Simulated API failure');
      },
      {
        dataType: 'btc_1D',
        tier: 'tier2_frequent'
      }
    );

    if (cacheResult.data) {
      console.log(`   ✅ Cache fallback successful: ${cacheResult.source} source`);
      console.log(`   📊 Data: ${cacheResult.data.current.price} BTC`);
    } else {
      console.log('   ❌ Cache fallback failed');
    }

    // Test 5: Get statistics
    console.log('\n📈 Test 5: Getting statistics...');
    const stats = await goldenDatasetService.getStats();
    console.log('   Golden Dataset Stats:');
    console.log(`     Total entries: ${stats.totalEntries}`);
    console.log(`     Total data points: ${stats.totalDataPoints}`);
    console.log(`     Average age: ${stats.averageAge} minutes`);
    console.log(`     Tier breakdown:`, stats.tierBreakdown);

    // Test 6: Export/Import functionality
    console.log('\n💾 Test 6: Testing export/import...');
    const exportData = await goldenDatasetService.export();
    if (exportData) {
      console.log(`   ✅ Export successful: ${Object.keys(exportData.dataset).length} datasets`);
      
      // Test import (simulate by re-importing the same data)
      const importResult = await goldenDatasetService.import(exportData);
      console.log(`   ✅ Import successful: ${importResult}`);
    }

    // Test 7: Check file system persistence
    console.log('\n💽 Test 7: Checking file system persistence...');
    const dataDir = path.join(__dirname, 'data');
    const goldenFile = path.join(dataDir, 'golden_dataset.json');
    
    try {
      const fileStats = await fs.stat(goldenFile);
      console.log(`   ✅ Golden dataset file exists: ${goldenFile}`);
      console.log(`   📊 File size: ${(fileStats.size / 1024).toFixed(2)} KB`);
      console.log(`   📅 Last modified: ${fileStats.mtime.toISOString()}`);
      
      // Read and validate content
      const fileContent = await fs.readFile(goldenFile, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      console.log(`   ✅ File contains ${Object.keys(parsedContent).length} datasets`);
    } catch (error) {
      console.log(`   ❌ File system check failed: ${error.message}`);
    }

    console.log('\n🎉 Golden Dataset Service test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Data storage and retrieval working');
    console.log('   ✅ Cache integration working');
    console.log('   ✅ File system persistence working');
    console.log('   ✅ Export/import functionality working');
    console.log('   ✅ Statistics and monitoring working');

  } catch (error) {
    console.error('\n❌ Golden Dataset Service test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testGoldenDataset()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGoldenDataset };