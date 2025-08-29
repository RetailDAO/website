# Backend project structure
crypto-dashboard-api/
├── src/
│   ├── controllers/
│   │   ├── btcController.js
│   │   ├── dxyController.js
│   │   ├── etfController.js
│   │   ├── fundingController.js
│   │   └── rsiController.js
│   ├── services/
│   │   ├── dataProviders/
│   │   │   ├── cryptoDataService.js
│   │   │   ├── traditionalDataService.js
│   │   │   └── apiClients.js
│   │   ├── analysis/
│   │   │   ├── btcAnalysisService.js
│   │   │   ├── dxyAnalysisService.js
│   │   │   ├── etfFlowsService.js
│   │   │   └── fundingRatesService.js
│   │   └── cache/
│   │       └── cacheService.js
│   ├── utils/
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── constants.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── cors.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── api.js
│   │   └── health.js
│   ├── config/
│   │   ├── database.js
│   │   └── environment.js
│   └── app.js
├── tests/
├── package.json
├── .env.example
└── server.js