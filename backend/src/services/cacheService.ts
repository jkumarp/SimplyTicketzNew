import { redisService } from '../config/redisClient';

export class CacheService {
  private static client = redisService.getClient();

  /**
   * Caches string or parsed JSON object entities with fixed TTL rules
   */
  public static async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttlSeconds) {
      // EX options enforce strict TTL expiration deadlines
      await this.client.set(key, stringValue, { EX: ttlSeconds });
    } else {
      await this.client.set(key, stringValue);
    }
  }

  /**
   * Fetches strongly-typed data payloads automatically resolving parsing logic
   */
  public static async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
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
    await this.client.del(key);
  }
}
