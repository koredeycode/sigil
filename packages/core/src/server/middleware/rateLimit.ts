import rateLimit from 'express-rate-limit';

// Global API limiter: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { message: 'Too many requests, please try again later.', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});

// LLM endpoints (costly): 10 requests per minute per IP
export const llmLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 10, 
  message: { message: 'Rate limit exceeded for AI operations. Please wait a minute before trying again.', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints: 5 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { message: 'Too many authentication attempts, please try again later.', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});
