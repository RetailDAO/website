const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true, // Explicitly trust proxy for accurate IP detection
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    'Too many requests from this IP, please try again later'
  ),

  intensive: createRateLimiter(
    5 * 60 * 1000, // 5 minutes  
    20, // 20 requests per 5 minutes for intensive operations
    'Too many intensive requests, please slow down'
  ),

  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 login attempts per 15 minutes
    'Too many authentication attempts'
  )
};

module.exports = rateLimiters.general;
module.exports.intensive = rateLimiters.intensive;
module.exports.auth = rateLimiters.auth;