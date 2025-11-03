import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

// Create cache instance with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
}

/**
 * Cache middleware for GET requests
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const { ttl = 300, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey =
      keyGenerator?.(req) ||
      `${req.originalUrl}_${JSON.stringify(req.query)}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (body: any) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, body, ttl);
      }
      return originalJson(body);
    } as any;

    next();
  };
};

/**
 * Clear cache for a specific pattern
 */
export const clearCache = (pattern: string) => {
  const keys = cache.keys();
  const regex = new RegExp(pattern);
  keys.forEach((key) => {
    if (regex.test(key)) {
      cache.del(key);
    }
  });
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  cache.flushAll();
};

export default cache;

