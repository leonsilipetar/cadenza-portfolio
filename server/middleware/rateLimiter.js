const rateLimit = require('express-rate-limit');

// Default rate limiter - 300 requests per minute per IP
const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again after a minute'
  }
});

// Pending user registration rate limiter
const pendingUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: {
    error: 'Previše pokušaja registracije. Molimo pokušajte ponovno za sat vremena.'
  }
});

// Login rate limiter - stricter to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});

// More lenient limiter for static resources (profile pictures, etc.)
const staticResourceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  message: {
    error: 'Too many requests for static resources'
  }
});

// Chat-specific rate limiter - more requests allowed for real-time features
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 400, // 400 requests per minute
  message: {
    error: 'Too many chat requests, please try again after a minute'
  }
});

// FCM token update limiter - very lenient as it's critical
const fcmLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 50 requests per 5 minutes
  message: {
    error: 'Too many FCM token update requests'
  }
});

// Enrollment rate limiter - prevent abuse during enrollment periods
const enrollmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 enrollment attempts per hour per user
  message: {
    error: 'Previše pokušaja upisa. Molimo pokušajte ponovno za sat vremena.'
  },
  keyGenerator: (req) => req.user?.id || req.ip // Rate limit by user ID if authenticated, otherwise by IP
});

// Enrollment status check limiter - more lenient for checking status
const enrollmentStatusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 status checks per minute per user
  message: {
    error: 'Previše provjera statusa upisa. Molimo pokušajte ponovno za minutu.'
  },
  keyGenerator: (req) => req.user?.id || req.ip
});

module.exports = {
  defaultLimiter,
  loginLimiter,
  staticResourceLimiter,
  chatLimiter,
  fcmLimiter,
  pendingUserLimiter,
  enrollmentLimiter,
  enrollmentStatusLimiter
}; 