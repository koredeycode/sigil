import rateLimit from 'express-rate-limit';
import { CONSTANTS } from '../../lib/Constants.js';

// General API Rate Limit
export const apiLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMITS.API_WINDOW_MS,
  max: CONSTANTS.RATE_LIMITS.API_MAX_REQUESTS,
  message: { message: 'Too many requests to the API, please try again later.', data: null },
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

// Authentication Endpoints Limiter
export const authLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMITS.AUTH_WINDOW_MS,
  max: CONSTANTS.RATE_LIMITS.AUTH_MAX_REQUESTS,
  message: { message: 'Too many authentication attempts, please try again later.', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});
