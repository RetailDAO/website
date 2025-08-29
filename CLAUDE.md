# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RetailDAO cryptocurrency analytics platform with Node.js/Express backend and React/Vite frontend providing real-time crypto data, technical analysis, and market insights.

## Architecture

**Full-stack separation**: Backend API (`/backend`) and frontend client (`/frontend`) as independent applications.

**Backend** (`/backend`):
- Express.js API with WebSocket support on port 8000
- Redis caching with fallback mock data system
- Service-oriented architecture: controllers → services → data providers
- External API integrations: CoinGecko, Binance, Alpha Vantage with intelligent rate limiting
- Real-time WebSocket streaming for BTC/ETH prices
- Comprehensive test suite with Jest

**Frontend** (`/frontend`):
- React 18 + Vite with Tailwind CSS
- ApexCharts and Recharts for data visualization  
- WebSocket client for real-time updates
- Dark/light theme system with context API
- Component-based architecture with custom hooks

**Key Services**:
- `dataProviders/`: External API clients with rate limiting
- `analysis/`: Technical indicator calculations (RSI, moving averages)
- `cache/`: Redis caching with TTL management
- `websocket/`: Real-time price streaming service

## Development Commands

### Backend Development
```bash
cd backend
npm install
npm run dev          # Development server with nodemon
npm test            # Run tests in watch mode
npm run test:ci     # CI test mode with coverage
npm run lint        # ESLint check
npm run lint:fix    # Auto-fix linting issues
npm run format      # Prettier code formatting
npm start           # Production server
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev         # Vite development server (port 3000)
npm run build       # Production build
npm run preview     # Preview production build
npm test            # Vitest tests
npm run lint        # ESLint with auto-fix
```

### Prerequisites
- Node.js 16+ and Redis server
- API keys in `.env` files (use `.env.example` templates)
- Redis container: `docker start redis-crypto`

## Testing Strategy

**Backend**: Jest with Supertest for API endpoint testing, middleware validation, and service integration tests.

**Frontend**: Vitest + Testing Library for component testing, hook testing, and user interaction testing.

Run backend tests before committing - the test suite validates API endpoints, WebSocket functionality, and error handling.

## Key Technical Details

**API Rate Limiting**: Intelligent request queuing for external APIs (CoinGecko: 50/min, Alpha Vantage: 5/min)

**Data Flow**: Real data from CoinGecko/Binance with graceful fallback to mock data when APIs unavailable

**WebSocket**: Live price feeds on `/ws/prices` endpoint with connection status monitoring

**Caching**: Redis-based caching with 5-minute TTL, automatic cache invalidation

**Environment Configuration**: Backend uses port 8000, frontend expects API at `localhost:8000`

## Error Handling

The application includes comprehensive error handling with fallback mock data. Console logs indicate data sources:
- `✅ [CoinGecko] Successfully fetched` - Real API data
- `🎭 [Mock] Serving mock` - Fallback data
- `🔌 Connected to binance WebSocket` - Live WebSocket connection

## API Endpoints

Primary endpoints:
- `/api/v1/crypto/multi-analysis` - Comprehensive multi-asset analysis
- `/api/v1/btc/price` - Current Bitcoin price
- `/api/v1/funding-rates` - Cryptocurrency funding rates
- `/api/v1/rsi?symbol=BTCUSDT` - RSI technical indicator
- `/health` - API health check
- WebSocket: `/ws/prices` for real-time price streaming