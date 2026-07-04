export abstract class CacheRepository {
  abstract set(key: string, value: string, ttlInSeconds?: number): Promise<void>;
  abstract get(key: string): Promise<string | null>;
  abstract delete(key: string): Promise<void>;
  abstract deleteByPrefix(prefix: string): Promise<void>;

  async remember<T>(key: string, ttlInSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    const value = await factory();
    await this.set(key, JSON.stringify(value), ttlInSeconds);

    return value;
  }
}
