#!/usr/bin/env node

/**
 * RetailDAO Terminal Implementation Validation Script
 * Run this script to verify all critical fixes are working
 * Usage: node validate_implementation.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

class ImplementationValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, details };
    
    console.log(`[${level.toUpperCase()}] ${message}`);
    if (details) console.log('  Details:', details);
    
    this.results.details.push(entry);
    
    switch(level) {
      case 'pass': this.results.passed++; break;
      case 'fail': this.results.failed++; break;
      case 'warn': this.results.warnings++; break;
    }
  }

  async testApiEndpoints() {
    console.log('\n🔍 Testing API Endpoints...');
    
    const endpoints = [
      '/api/v1/health',
      '/api/v1/btc/price', 
      '/api/v1/crypto/multi-analysis?symbols=BTC,ETH&timeframe=1D',
      '/api/v1/funding-rates?symbol=BTC',
      '/api/v1/rsi?symbol=BTC&timeframe=1D&period=14'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, { timeout: 10000 });
        
        if (response.status === 200 && response.data) {
          this.log('pass', `API endpoint working: ${endpoint}`);
        } else {
          this.log('fail', `API endpoint returned unexpected response: ${endpoint}`, response.status);
        }
      } catch (error) {
        this.log('fail', `API endpoint failed: ${endpoint}`, error.message);
      }
    }
  }

  async testFileStructure() {
    console.log('\n📁 Validating File Structure...');
    
    const criticalFiles = [
      'backend/src/app.js',
      'backend/src/routes/api.js',
      'backend/src/services/scheduler/cronJobs.js',
      'backend/src/services/rateLimitedApi.js',
      'frontend/src/main.jsx',
      'frontend/src/components/ErrorBoundary.jsx',
      'frontend/src/hooks/useReactQueryApi.js'
    ];

    for (const file of criticalFiles) {
      const fullPath = path.join(__dirname, file);
      if (fs.existsSync(fullPath)) {
        this.log('pass', `Critical file exists: ${file}`);
      } else {
        this.log('fail', `Critical file missing: ${file}`);
      }
    }

    // Check for removed debug files
    const debugFiles = [
      'frontend/src/app-debug.jsx',
      'frontend/src/app-test.jsx',
      'test_intelligent_mock.js',
      'test_golden_dataset.js'
    ];

    for (const file of debugFiles) {
      const fullPath = path.join(__dirname, file);
      if (!fs.existsSync(fullPath)) {
        this.log('pass', `Debug file removed: ${file}`);
      } else {
        this.log('warn', `Debug file still exists: ${file}`);
      }
    }
  }

  async testPackageDependencies() {
    console.log('\n📦 Checking Package Dependencies...');
    
    try {
      // Check backend dependencies
      const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
      const requiredBackendDeps = ['bottleneck', 'node-cron', 'ws', 'ioredis'];
      
      for (const dep of requiredBackendDeps) {
        if (backendPkg.dependencies[dep]) {
          this.log('pass', `Backend dependency installed: ${dep}`);
        } else {
          this.log('fail', `Backend dependency missing: ${dep}`);
        }
      }

      // Check frontend dependencies  
      const frontendPkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
      const requiredFrontendDeps = ['@tanstack/react-query', '@tanstack/react-query-devtools'];
      
      for (const dep of requiredFrontendDeps) {
        if (frontendPkg.dependencies[dep]) {
          this.log('pass', `Frontend dependency installed: ${dep}`);
        } else {
          this.log('fail', `Frontend dependency missing: ${dep}`);
        }
      }
      
    } catch (error) {
      this.log('fail', 'Failed to read package.json files', error.message);
    }
  }

  async testCodeQuality() {
    console.log('\n🧹 Checking Code Quality...');
    
    try {
      // Check main app.js uses correct routes
      const appJs = fs.readFileSync('backend/src/app.js', 'utf8');
      
      if (appJs.includes("require('./routes/api')") && !appJs.includes("require('./routes/api_test')")) {
        this.log('pass', 'Backend app.js uses correct API routes');
      } else {
        this.log('fail', 'Backend app.js still uses test routes or incorrect import');
      }

      // Check cron jobs integration
      if (appJs.includes('cronJobService') && appJs.includes('initializeJobs')) {
        this.log('pass', 'Cron jobs integrated into main application');
      } else {
        this.log('fail', 'Cron jobs not properly integrated');
      }

      // Check React Query integration
      const mainJsx = fs.readFileSync('frontend/src/main.jsx', 'utf8');
      
      if (mainJsx.includes('QueryClientProvider') && mainJsx.includes('react-query')) {
        this.log('pass', 'React Query integrated in frontend');
      } else {
        this.log('fail', 'React Query not properly integrated');
      }

    } catch (error) {
      this.log('fail', 'Failed to analyze code quality', error.message);
    }
  }

  async testRateLimiting() {
    console.log('\n⏱️ Testing Rate Limiting Implementation...');
    
    try {
      const rateLimitedApi = fs.readFileSync('backend/src/services/rateLimitedApi.js', 'utf8');
      
      if (rateLimitedApi.includes('Bottleneck') && rateLimitedApi.includes('reservoir')) {
        this.log('pass', 'Bottleneck rate limiting implemented');
      } else {
        this.log('fail', 'Bottleneck rate limiting not properly implemented');
      }

      // Check limiter configurations
      const providers = ['coingecko', 'alpha-vantage', 'binance', 'polygon'];
      for (const provider of providers) {
        if (rateLimitedApi.includes(`'${provider}':`)) {
          this.log('pass', `Rate limiter configured for ${provider}`);
        } else {
          this.log('warn', `Rate limiter not found for ${provider}`);
        }
      }
      
    } catch (error) {
      this.log('fail', 'Failed to analyze rate limiting', error.message);
    }
  }

  async performHealthCheck() {
    console.log('\n❤️ Performing Health Check...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/health`, { timeout: 5000 });
      
      if (response.data.success) {
        this.log('pass', 'Backend health check successful');
        if (response.data.uptime) {
          this.log('pass', `Backend uptime: ${Math.round(response.data.uptime)}s`);
        }
      } else {
        this.log('fail', 'Backend health check returned failure');
      }
      
    } catch (error) {
      this.log('fail', 'Backend health check failed - server may not be running', error.code);
    }
  }

  generateReport() {
    console.log('\n📊 VALIDATION REPORT');
    console.log('====================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
    
    console.log(`\n📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED CHECKS:');
      this.results.details
        .filter(item => item.level === 'fail')
        .forEach(item => console.log(`  - ${item.message}`));
    }

    if (this.results.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.details
        .filter(item => item.level === 'warn')
        .forEach(item => console.log(`  - ${item.message}`));
    }

    console.log('\n🎯 READINESS ASSESSMENT:');
    if (this.results.failed === 0) {
      console.log('🟢 READY FOR CLIENT DEMO');
    } else if (this.results.failed <= 2) {
      console.log('🟡 MOSTLY READY - Minor fixes needed');
    } else {
      console.log('🔴 NOT READY - Critical issues to resolve');
    }
  }

  async runValidation() {
    console.log('🚀 RetailDAO Terminal Implementation Validation');
    console.log('===============================================');
    
    await this.testFileStructure();
    await this.testPackageDependencies();
    await this.testCodeQuality();
    await this.testRateLimiting();
    await this.performHealthCheck();
    await this.testApiEndpoints();
    
    this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ImplementationValidator();
  validator.runValidation().catch(console.error);
}

module.exports = ImplementationValidator;