import NodeCache from 'node-cache';
import { redisService } from '../config/redisClient';

type CacheProvider = 'redis' | 'memory';

// CACHE_PROVIDER selects the backing store: 'redis' (default, shared across instances)
// or 'memory' (in-process node-cache, useful for local dev or single-instance deployments).
const CACHE_PROVIDER: CacheProvider =
  (process.env.CACHE_PROVIDER || '').toLowerCase() === 'memory' ? 'memory' : 'redis';

const memoryCache = new NodeCache({
  stdTTL: Number(process.env.CACHE_DEFAULT_TTL_SECONDS) || 0,
  checkperiod: 120,
});

export class CacheService {
  private static redisClient = redisService.getClient();

  /**
   * Caches string or parsed JSON object entities with fixed TTL rules
   */
  public static async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (CACHE_PROVIDER === 'memory') {
      if (ttlSeconds) {
        memoryCache.set(key, stringValue, ttlSeconds);
      } else {
        memoryCache.set(key, stringValue);
      }
      return;
    }

    if (ttlSeconds) {
      // EX options enforce strict TTL expiration deadlines
      await this.redisClient.set(key, stringValue, { EX: ttlSeconds });
    } else {
      await this.redisClient.set(key, stringValue);
    }
  }

  /**
   * Fetches strongly-typed data payloads automatically resolving parsing logic
   */
  public static async get<T>(key: string): Promise<T | null> {
    const data =
      CACHE_PROVIDER === 'memory'
        ? memoryCache.get<string>(key) ?? null
        : await this.redisClient.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  /**
   * Removes specific keys to proactively clean stale cached targets
   */
  public static async delete(key: string): Promise<void> {
    if (CACHE_PROVIDER === 'memory') {
      memoryCache.del(key);
      return;
    }
    await this.redisClient.del(key);
  }
}
