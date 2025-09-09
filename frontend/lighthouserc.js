// Lighthouse CI configuration for Market Overview v2 performance monitoring
export default {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        preset: 'desktop',
        onlyCategories: ['performance'],
        skipAudits: [
          'canonical',
          'is-crawlable',
          'robots-txt',
          'hreflang',
          'plugins',
          'tap-targets'
        ]
      }
    },
    assert: {
      assertions: {
        // Performance targets for Market Overview v2
        'categories:performance': ['error', { minScore: 0.85 }], // 85+ score target
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }], // <1.8s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // <2.5s
        'speed-index': ['error', { maxNumericValue: 1500 }], // <1.5s target
        'total-blocking-time': ['error', { maxNumericValue: 200 }], // <200ms target
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // <0.1 target
        'interactive': ['error', { maxNumericValue: 2500 }], // <2.5s
        
        // Bundle size and resource audits
        'unused-javascript': ['warn', { maxLength: 1 }], // Minimize unused JS
        'uses-optimized-images': ['warn', { maxLength: 0 }],
        'modern-image-formats': ['warn', { maxLength: 0 }],
        'uses-text-compression': ['error', { maxLength: 0 }],
        'uses-responsive-images': ['warn', { maxLength: 0 }],
        
        // Network efficiency
        'render-blocking-resources': ['warn', { maxLength: 1 }],
        'efficient-animated-content': ['warn', { maxLength: 0 }],
        'uses-rel-preconnect': ['warn', { maxLength: 2 }],
        
        // Runtime performance  
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 2000 }],
        'bootup-time': ['warn', { maxNumericValue: 1000 }],
        'uses-passive-event-listeners': ['error', { maxLength: 0 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};