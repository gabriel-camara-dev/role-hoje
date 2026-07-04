import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CacheRepository } from '../cache-repository';
import { RedisService } from './redis.service';

@Injectable()
export class RedisCacheRepository implements CacheRepository {
  private static readonly defaultTtlInSeconds = 60 * 15;
  private readonly logger = new Logger(RedisCacheRepository.name);

  constructor(@Inject(RedisService) private redis: RedisService) {}

  async set(key: string, value: string, ttlInSeconds = RedisCacheRepository.defaultTtlInSeconds): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlInSeconds);
    } catch (error) {
      this.logger.warn(`Redis cache set skipped for ${key}: ${String(error)}`);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.warn(`Redis cache get skipped for ${key}: ${String(error)}`);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Redis cache delete skipped for ${key}: ${String(error)}`);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      await this.redis.deleteByPrefix(prefix);
    } catch (error) {
      this.logger.warn(`Redis cache delete by prefix skipped for ${prefix}: ${String(error)}`);
    }
  }

  async remember<T>(key: string, ttlInSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);

    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (error) {
        this.logger.warn(`Invalid cached payload for key ${key}: ${String(error)}`);
        await this.delete(key);
      }
    }

    const value = await factory();
    await this.set(key, JSON.stringify(value), ttlInSeconds);

    return value;
  }
}
