import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from './rateLimiter';

export const apiRateLimiter = () => {
  const windowSeconds = Number(process.env.REDIS_SECONDS||10);
  const maxRequests = Number(process.env.REDIS_COUNT||50);
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Identify by logged-in user ID, or fall back to their IP address
    const identifier = (req as any).user?.user_id || req.ip || 'anonymous';

    // Scope the bucket to this specific route (method + matched route pattern,
    // e.g. "GET:/invoices") rather than sharing one global counter across
    // every endpoint. Previously a single page that fired several sequential
    // calls to different endpoints (tickets-by-invoiceId, merchant-services,
    // ticket-categories, ...) could exhaust the whole quota before its own
    // request even ran, causing unrelated routes to 429 each other out.
    const routeKey = `${req.method}:${req.baseUrl}${req.route?.path || req.path}`;
    const scopedIdentifier = `${identifier}:${routeKey}`;

    try {
      const { allowed, currentCount, remaining } = await RateLimiter.isAllowed(scopedIdentifier, {
        windowSizeInSeconds: windowSeconds,
        maxRequests: maxRequests
      });

      // Good API practice: Always inform client applications of their limit status via headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (!allowed) {
        res.status(429).json({
          status: 'fail',
          message: 'Too many requests. Please slow down and try again later.',
          currentRequestsInWindow: currentCount,
          maxAllowed: maxRequests
        });
        return; 
      }

      next(); // Request is within bounds, proceed to the API controller logic
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail-open strategy: If Redis fails, let requests through so the app doesn't crash completely
      next(); 
    }
  };
};
