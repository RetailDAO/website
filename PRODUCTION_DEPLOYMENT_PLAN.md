# RetailDAO Terminal Production Deployment Plan

## 🚨 **IMMEDIATE ACTION REQUIRED**

Your production deployments need updating to use the optimized version:

### **1. Backend (Railway) - CRITICAL UPDATE**
**URL**: `https://website-production-8f8a.up.railway.app`
**Status**: ❌ Running OLD/BROKEN version (returns 404 on health endpoint)
**Action**: Deploy your current optimized codebase immediately

### **2. Frontend (Vercel) - VERIFY URL** 
**Current URL**: `https://retaildaoanalyticsdashboard-cztsol6ej.vercel.app`
**Status**: ❓ Returns 401 - may be wrong URL or protected
**Action**: Verify correct Vercel deployment URL

---

## 📋 **REQUIRED CONFIGURATION UPDATES**

### **Backend Environment Variables (Railway)**
Update your Railway deployment with these environment variables:
```bash
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://[YOUR-CORRECT-VERCEL-URL]

# API Keys (use your existing ones)
COINGECKO_API_KEY=CG-gA4LBy12YtPck7Vtyb1hPGdR
ALPHA_VANTAGE_API_KEY=QEL3JS1MASQ3ESMI
BINANCE_API_KEY=w82fOEgQjiUxLCcl6V2DOfB7eq0UZS3As8AGl1lpoQA4kJZmJtotviyl1aclOLkv
BINANCE_SECRET_KEY=xNhw8PbgVrovS1895uqrA05hSezocxlP1WAR3Dz6YS730fWWj4LQysdpQ0fsrklS
POLYGON_API_KEY=0FdTExJFsmgBcy8CQ6GqGg1xSk0L2FeA
COINGLASS_API_KEY=f1cb9e1eeafb4fc38d3dba39ecb84d34

# Redis (Railway provides managed Redis)
REDIS_URL=[Railway-provided-Redis-URL]
CACHE_TTL=300

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **Frontend Environment Variables (Vercel)**
Create `.env.production` in your frontend folder:
```bash
VITE_API_BASE_URL=https://website-production-8f8a.up.railway.app
VITE_WS_BASE_URL=wss://website-production-8f8a.up.railway.app
VITE_ENVIRONMENT=production
VITE_ENABLE_WEBSOCKETS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_DARK_MODE=true
```

---

## 🔧 **CORS CONFIGURATION UPDATE**

Your backend CORS is correctly configured to use environment variables:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
```

**✅ This is perfect** - it will automatically use the production URL when `FRONTEND_URL` is set.

---

## 🚀 **DEPLOYMENT SEQUENCE**

### **Step 1: Update Backend CORS**
Before deploying, update your backend `.env` for production testing:
```bash
NODE_ENV=production  
FRONTEND_URL=https://[YOUR-CORRECT-VERCEL-URL]
```

### **Step 2: Deploy to Railway**
1. Commit and push your optimized code
2. Railway will auto-deploy from your repository
3. Set environment variables in Railway dashboard
4. Verify deployment at: `https://website-production-8f8a.up.railway.app/api/v1/health`

### **Step 3: Deploy to Vercel**
1. Set environment variables in Vercel dashboard
2. Deploy frontend code
3. Verify correct deployment URL
4. Test full integration

### **Step 4: Update Frontend API URL (if needed)**
If your Vercel URL changed, update the frontend API service:
```javascript
// In frontend/src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-production-8f8a.up.railway.app';
```

---

## 🔍 **VERIFICATION CHECKLIST**

After deployment, verify these work:
- [ ] `https://website-production-8f8a.up.railway.app/api/v1/health` returns 200 OK
- [ ] `https://[vercel-url]` loads the dashboard
- [ ] Real-time price updates work
- [ ] WebSocket connections establish successfully
- [ ] No CORS errors in browser console
- [ ] All API endpoints respond correctly

---

## ⚠️ **CRITICAL NOTES**

1. **Backend MUST be deployed first** - the current Railway deployment is broken
2. **Verify Vercel URL** - the current one returns 401 (may be wrong)
3. **Test CORS thoroughly** - ensure frontend can communicate with backend
4. **Check Rate Limiting** - the new bottleneck system needs testing in production

---

## 🎯 **SUCCESS METRICS**

Your production deployment is successful when:
- ✅ All API endpoints return valid data
- ✅ Real-time WebSocket connections work
- ✅ Frontend loads without errors
- ✅ CORS allows proper communication
- ✅ Rate limiting prevents API quota exhaustion
- ✅ Error handling gracefully falls back to mock data

**The optimized version you just built will replace the failing production system with professional-grade reliability and performance.**