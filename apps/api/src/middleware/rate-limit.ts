import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const skip = () => env.NODE_ENV === 'test';

/** 10 requests per 15 minutes per IP — applied to all /auth/* routes */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});

/** 60 requests per minute per IP — applied to authenticated write endpoints */
export const writeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});
