import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvService } from '@/infra/env/env.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly subscriber: Redis;

  constructor(@Inject(EnvService) private env: EnvService) {
    this.client = this.createClient();
    this.subscriber = this.createClient();
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlInSeconds?: number) {
    if (ttlInSeconds) {
      await this.client.set(key, value, 'EX', ttlInSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async publish(channel: string, message: string) {
    try {
      await this.client.publish(channel, message);
    } catch (error) {
      this.logger.warn(`Redis publish skipped: ${String(error)}`);
    }
  }

  async subscribe(channel: string, handler: (message: string) => void) {
    try {
      await this.subscriber.subscribe(channel);
    } catch (error) {
      this.logger.warn(`Redis subscribe skipped: ${String(error)}`);
      return;
    }

    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        handler(message);
      }
    });
  }

  async onModuleDestroy() {
    this.client.disconnect();
    this.subscriber.disconnect();
  }

  private createClient() {
    const password = this.env.get('REDIS_PASSWORD');
    const redis = new Redis({
      host: this.env.get('REDIS_HOST'),
      port: this.env.get('REDIS_PORT'),
      password: password || undefined,
      db: this.env.get('REDIS_DB'),
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });

    redis.on('error', (error) => {
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });

    redis.connect().catch((error) => {
      this.logger.warn(`Redis connection failed: ${error.message}`);
    });

    return redis;
  }
}
