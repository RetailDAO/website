# RetailDAO Terminal - Real-Time Crypto Analytics Platform ⚡

![Concurrent Users Projections](frontend/public/concurernt_users_projections.png)

> **A high-performance cryptocurrency analytics terminal built with real-time WebSocket streaming, intelligent caching, and modern React architecture.**

## 🌟 **Current Status: Production Ready**

### **Live Features:**
- ✅ **Market Overview v2** - 6 real-time analytics cards with optimized layouts
- ✅ **WebSocket Streaming** - Live price updates and technical indicators 
- ✅ **Smart Caching System** - 87% API call reduction with 4-tier cache strategy
- ✅ **Connection Monitoring** - Real-time system health and data quality tracking
- ✅ **Terminal UI** - Dark/cyberpunk aesthetic with responsive design

### **Deployment URLs:**
- **Frontend**: https://retaildao-terminal.vercel.app
- **Backend**: https://website-production-8f8a.up.railway.app  
- **WebSocket**: wss://website-production-8f8a.up.railway.app/ws/prices

---

## 🏗️ **Architecture Overview**

### **Tech Stack:**
- **Backend**: Node.js + Express + WebSocket + Redis + Binance API
- **Frontend**: React 18 + Vite + Tailwind CSS + ApexCharts + Recharts
- **Real-time**: Dual WebSocket servers (prices + indicators)
- **Caching**: Multi-tier Redis with Golden Dataset fallback
- **Deployment**: Railway (backend) + Vercel (frontend)

### **Core Components:**

```
📊 Market Overview Cards:
├── MovingAveragesCard     # BTC price + MA analysis
├── LiquidityPulseCard     # Market liquidity metrics  
├── StateOfLeverageCard    # Leverage analysis
├── FuturesBasisCard       # Futures basis analysis
├── RotationBreadthCard    # Alt vs BTC performance
└── ETFFlowsCard          # Bitcoin ETF flows

🔌 Real-time Services:
├── Price WebSocket        # Live BTC/ETH/SOL prices
├── Indicator Streaming    # RSI + MA calculations
├── Connection Status      # System health monitoring
└── Cache Management       # Smart data persistence
```

---

## 🚀 **Quick Start**

### **Backend Setup:**
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Add your API keys:
# COINGECKO_API_KEY, BINANCE_API_KEY, REDIS_URL

# Development
npm run dev                # Start with nodemon
npm test                   # Run test suite
npm start                  # Production mode

# Health check
curl http://localhost:8000/health
```

### **Frontend Setup:**
```bash
cd frontend  
npm install

# Development
npm run dev                # Vite dev server (port 3000)
npm run build              # Production build
npm run preview            # Preview production build

# Test build
npm run lint               # ESLint check
```

### **Environment Configuration:**

**Backend (.env):**
```env
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://retaildao-terminal.vercel.app
COINGECKO_API_KEY=your_key_here
BINANCE_API_KEY=your_key_here
REDIS_URL=redis://localhost:6379
```

**Frontend (.env.production):**
```env
VITE_API_BASE_URL=https://website-production-8f8a.up.railway.app
VITE_WS_BASE_URL=wss://website-production-8f8a.up.railway.app
VITE_ENVIRONMENT=production
VITE_ENABLE_WEBSOCKETS=true
```

---

## 📊 **Market Overview v2 Features**

### **1. Moving Averages Card**
- **Real-time BTC Price** with 24h change
- **Technical Analysis**: 20, 50, 100, 200-day moving averages
- **Volume & Market Cap** with formatting
- **Trend Analysis**: Bull/bear/consolidation detection

### **2. Liquidity Pulse Card**
- **Market Liquidity Score** (0-100)
- **Order Book Depth** analysis
- **Volatility Metrics** with historical comparison
- **Pulse Visualization** with animated indicators

### **3. State of Leverage Card**  
- **Leverage Traffic Light** (Green/Yellow/Red)
- **Funding Rates** across exchanges
- **Long/Short Ratios** with percentages
- **Risk Assessment** with recommendations

### **4. Futures Basis Card**
- **Spot vs Futures** price differential
- **Basis Analysis** with historical context
- **Contango/Backwardation** detection
- **Market Regime** classification

### **5. Rotation Breadth Card**
- **Alt Season Indicator** percentage
- **Market Breadth** gauge (BTC vs alts)
- **Top Performers** list
- **Rotation Analysis** with trend direction

### **6. ETF Flows Card**
- **Bitcoin ETF Flows** with 5-day totals
- **Inflow/Outflow** visualization
- **Flow Trends** with period selection
- **Market Impact** analysis

---

## 🔌 **WebSocket Architecture**

### **Dual WebSocket System:**

**Price Streaming (`/ws/prices`):**
```javascript
// Real-time price updates
{
  type: "price_update",
  symbol: "BTCUSDT", 
  price: 43250.50,
  change24h: 2.34,
  volume24h: 125000000,
  timestamp: "2025-01-15T10:30:00Z"
}
```

**Indicator Streaming (`/ws/indicators`):**
```javascript
// Technical indicator updates
{
  type: "indicators_update",
  symbol: "BTCUSDT",
  rsi: { "14": 65.2, "21": 62.8 },
  ma: { "20": 42800, "50": 41500, "200": 38900 },
  timestamp: "2025-01-15T10:30:00Z"
}
```

### **Connection Management:**
- **Auto-reconnection** with exponential backoff
- **Connection health monitoring** in sidebar
- **Fallback to polling** when WebSocket fails
- **Data quality scoring** with real-time status

---

## 🧠 **Intelligent Caching System**

### **4-Tier Cache Strategy:**
```javascript
cacheTiers: {
  tier1_realtime: 60,       // 1 min - Live prices
  tier2_frequent: 3600,     // 1 hour - Indicators  
  tier3_stable: 21600,      // 6 hours - Historical data
  tier4_historical: 172800  // 48 hours - Static data
}
```

### **Golden Dataset Service:**
- **Persistent storage** of last-known-good data
- **Automatic tier demotion** (fresh → stale → archived → fallback)
- **Zero-downtime fallbacks** during API outages
- **Data quality tracking** with timestamps and sources

### **Performance Metrics:**
- **87% API call reduction** achieved
- **<2 second response times** for all requests
- **>95% cache hit rate** in production
- **~15 API calls/hour** vs traditional 120/hour

---

## 📡 **API Endpoints**

### **Market Data:**
```bash
# Core endpoints
GET /api/v1/market-overview/moving-averages     # BTC moving averages
GET /api/v1/market-overview/liquidity-pulse     # Market liquidity
GET /api/v1/market-overview/leverage-state      # Leverage analysis
GET /api/v1/market-overview/futures-basis       # Futures basis
GET /api/v1/market-overview/rotation-breadth    # Market breadth
GET /api/v1/market-overview/etf-flows          # ETF flows

# Legacy endpoints (still supported)
GET /api/v1/crypto/multi-analysis              # Multi-asset analysis
GET /api/v1/btc/price                          # Current BTC price
GET /api/v1/funding-rates                      # Funding rates
```

### **WebSocket Endpoints:**
```bash
WS  /ws/prices                                 # Live price streaming
WS  /ws/indicators                             # Indicator streaming
```

### **System Monitoring:**
```bash
GET /health                                    # API health
GET /api/v1/market-overview/health             # System health check
```

---

## 🎨 **UI/UX Features**

### **Terminal Aesthetic:**
- **Dark cyberpunk theme** with neon accents
- **Monospace fonts** for technical data
- **Terminal-style headers** with brackets `[SYSTEM_STATUS]`
- **Animated indicators** for live data
- **Color-coded status** (green/yellow/red)

### **Responsive Design:**
- **Grid layout system** with automatic card sizing
- **Mobile-responsive** breakpoints
- **Optimized card heights** with overflow handling
- **Smooth animations** and transitions

### **Connection Status:**
- **Real-time sidebar** with system metrics
- **API connection monitoring** with color indicators
- **WebSocket health** tracking
- **Data freshness** timestamps
- **Performance metrics** display

---

## 🔧 **Development Commands**

### **Backend Development:**
```bash
npm run dev          # Development server with nodemon
npm test             # Jest test suite  
npm run test:ci      # CI tests with coverage
npm run lint         # ESLint code check
npm run lint:fix     # Auto-fix linting issues
npm run format       # Prettier formatting
npm start            # Production server
```

### **Frontend Development:**
```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build  
npm test             # Vitest component tests
npm run lint         # ESLint with auto-fix
```

### **Production Deployment:**
```bash
# Backend (Railway)
git push origin main  # Auto-deploy to Railway

# Frontend (Vercel)  
git push origin main  # Auto-deploy to Vercel

# Health verification
curl https://website-production-8f8a.up.railway.app/health
curl https://retaildao-terminal.vercel.app
```

---

## 🛡️ **Security & Reliability**

### **Error Handling:**
- **Global error boundaries** with graceful degradation
- **Unhandled promise** rejection recovery  
- **Graceful shutdown** with connection cleanup
- **Circuit breakers** for API rate limiting

### **Rate Limiting:**
- **Bottleneck.js** intelligent per-provider limiting
- **Adaptive backoff** on API errors
- **Request deduplication** to prevent duplicates
- **Conservative limits** (45/min CoinGecko, 5/min Alpha Vantage)

### **Production Features:**
- **CORS protection** with whitelist
- **Helmet.js security** headers
- **Express rate limiting** (100 req/15min per IP)
- **Trust proxy** configuration for accurate IPs

---

## 📈 **Performance Achievements**

### **Optimization Results:**
- ✅ **87% API call reduction** (120/hr → 15/hr)
- ✅ **Sub-2 second response times** for all endpoints
- ✅ **>95% uptime** with multi-tier fallbacks
- ✅ **Free-tier API compliance** maintained
- ✅ **Bundle size optimization** (28.60 kB CSS, 141.77 kB vendor)

### **Scalability:**
- ✅ **8-10 concurrent users** with excellent performance
- ✅ **<100ms WebSocket latency** for real-time updates
- ✅ **>90% cache hit rate** with intelligent warming
- ✅ **Zero downtime** during API provider outages

### **User Experience:**
- ✅ **Real-time data updates** every 5 minutes
- ✅ **Smooth UI animations** with optimized rendering
- ✅ **Mobile responsive** design
- ✅ **Accessibility features** with semantic HTML

---

## 🐛 **Troubleshooting**

### **Common Issues:**

**WebSocket Connection Fails:**
```bash
# Check WebSocket status
curl https://website-production-8f8a.up.railway.app/health

# Expected response:
{"status": "healthy", "websocket": "connected"}
```

**API Rate Limiting:**
```bash
# Console logs to monitor:
✅ [CoinGecko] Successfully fetched BTC data
🔄 [Rate Limiting] Waiting 5000ms for next request
🎭 [Mock] Serving fallback data
```

**Cache Performance:**
```bash
# Check cache metrics
curl https://website-production-8f8a.up.railway.app/api/v1/market-overview/health

# Expected: >90% hit rate, <5% error rate
```

### **Log Patterns:**
```
🟢 Normal Operations:
✅ [API] Data fetched successfully
📊 Streaming indicators to 3 clients
💾 Cache hit rate: 94.2%

🟡 Rate Limiting (Expected):  
🔄 [Rate Limit] Intelligent backoff active
⏳ Waiting between API batches

🔴 Errors (Investigate):
❌ Max reconnection attempts reached  
🚨 Graceful shutdown initiated
```

---

## 🎯 **Project Roadmap**

### **Current Version: v2.0 (Market Overview)**
- ✅ 6 analytics cards with real-time data
- ✅ WebSocket streaming architecture  
- ✅ Intelligent caching system
- ✅ Production deployment

### **Next Release: v2.1 (Enhanced Features)**
- 🔄 Additional technical indicators (MACD, Bollinger Bands)
- 🔄 Historical data charting
- 🔄 User customization options
- 🔄 Mobile app responsive improvements

### **Future Versions:**
- 📅 **v3.0**: Multi-asset support (ETH, SOL, etc.)
- 📅 **v3.1**: Advanced portfolio tracking  
- 📅 **v3.2**: Social sentiment analysis
- 📅 **v4.0**: AI-powered trading signals

---

## 💡 **Contributing**

### **Development Setup:**
1. **Fork the repository** and clone locally
2. **Install dependencies** for both frontend and backend
3. **Configure environment** variables with your API keys
4. **Run tests** to ensure everything works
5. **Make changes** and test thoroughly
6. **Submit pull request** with clear description

### **Code Standards:**
- **ESLint + Prettier** for consistent formatting
- **Jest/Vitest** for comprehensive testing
- **Semantic commits** for clear git history
- **TypeScript** migration in progress

### **Areas for Contribution:**
- 🎨 **UI/UX improvements** and animations
- 📊 **Additional technical indicators** and charts
- 🔧 **Performance optimizations** and caching
- 🧪 **Test coverage** expansion
- 📱 **Mobile responsiveness** enhancements

---

## 📞 **Support & Community**

### **Getting Help:**
- 📖 **Documentation**: Check this README and inline comments
- 🐛 **Issues**: GitHub Issues for bugs and feature requests  
- 💬 **Discord**: RetailDAO community server
- 📧 **Email**: Technical support available

### **Community Resources:**
- **GitHub Repository**: Source code and issue tracking
- **Discord Server**: Real-time community support
- **Documentation**: Comprehensive guides and API docs
- **Blog Posts**: Development updates and tutorials

---

## 📄 **License & Credits**

### **License:**
MIT License - see LICENSE file for details

### **Credits:**
- **Built by**: RetailDAO Community
- **APIs**: CoinGecko, Binance, Alpha Vantage
- **Hosting**: Railway (backend), Vercel (frontend)
- **Special Thanks**: All contributors and testers

---

*🚀 **RetailDAO Terminal** - Real-time crypto analytics with professional-grade performance and reliability*

**Live Demo**: https://retaildao-terminal.vercel.app