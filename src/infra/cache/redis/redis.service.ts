import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Redis, type RedisOptions } from 'ioredis';
import { EnvService } from '@/infra/env/env.service';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly subscriber: Redis;

  constructor(@Inject(EnvService) envService: EnvService) {
    const options = redisOptions(envService);

    super(options);

    this.subscriber = new Redis(options);
    this.on('error', (error) => this.logger.warn(`Redis unavailable: ${error.message}`));
    this.subscriber.on('error', (error) => this.logger.warn(`Redis subscriber unavailable: ${error.message}`));
  }

  async deleteByPrefix(prefix: string) {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.del(...keys);
      }
    } while (cursor !== '0');
  }

  async subscribeToChannel(channel: string, handler: (message: string) => void) {
    try {
      await this.subscriber.subscribe(channel);
    } catch (error) {
      this.logger.warn(`Redis subscribe skipped for ${channel}: ${String(error)}`);
      return;
    }

    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        handler(message);
      }
    });
  }

  onModuleDestroy() {
    this.subscriber.disconnect();
    return this.disconnect();
  }
}

function redisOptions(envService: EnvService): RedisOptions {
  const password = envService.get('REDIS_PASSWORD');

  return {
    host: envService.get('REDIS_HOST'),
    port: envService.get('REDIS_PORT'),
    password: password || undefined,
    db: envService.get('REDIS_DB'),
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  };
}
