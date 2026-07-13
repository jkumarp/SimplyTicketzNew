import { redisService } from '../config/redisClient'; // Uses the singleton client from our previous setup

interface RateLimitConfig {
  windowSizeInSeconds: number;
  maxRequests: number;
}

export class RateLimiter {
  private static client = redisService.getClient();

  /**
   * Checks if a user has exceeded their request limit.
   * @returns true if the request is ALLOWED, false if it is BLOCKED.
   */
  public static async isAllowed(
    identifier: string, 
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; currentCount: number; remaining: number }> {
    
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowSizeInSeconds * 1000;

    // Use an atomic multi-transaction chain to execute commands securely in one round-trip
    const transaction = this.client.multi();

    // 1. Remove timestamps older than our sliding window start time
    transaction.zRemRangeByScore(key, 0, windowStart);

    // 2. Add the current request's unique timestamp to the set
    transaction.zAdd(key, { score: now, value: now.toString() });

    // 3. Count how many requests are in the set right now
    transaction.zCard(key);

    // 4. Set an automatic expiration on the whole key so stale sets clean themselves up
    transaction.expire(key, config.windowSizeInSeconds);

    // Execute the transaction batch
    const results = await transaction.exec();
    if (!results) {
        throw new Error("Transaction failed");
    }
    
    const [, , countReply] = results;
    
    if (typeof countReply !== "number") {
        throw new Error("Unexpected Redis reply for ZCARD");
    }
    
    const currentCount = countReply;
    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    return {
      allowed,
      currentCount,
      remaining
    };
  }
}
