import type { CacheRepository } from './cache-repository';

type CacheKeyValue = string | number | boolean | Date | null | undefined;

export const ondeHojeCacheTtl = {
  todayMap: 20,
  topPlaces: 20,
  publicGroups: 60,
  globalRanking: 300,
} as const;

export const ondeHojeCachePrefixes = {
  todayMap: 'onde-hoje:map:today:',
  topPlaces: 'onde-hoje:map:top:',
  globalRanking: 'onde-hoje:map:global-ranking:',
  publicGroups: 'onde-hoje:groups:public:',
} as const;

export function ondeHojeCacheKey(prefix: string, values: Record<string, CacheKeyValue>) {
  const normalized = Object.keys(values)
    .sort()
    .reduce<Record<string, string | number | boolean | null>>((acc, key) => {
      const value = values[key];
      acc[key] = value instanceof Date ? value.toISOString().slice(0, 10) : (value ?? null);

      return acc;
    }, {});

  return `${prefix}${JSON.stringify(normalized)}`;
}

export async function invalidateOndeHojePlaceCaches(cacheRepository: CacheRepository) {
  await Promise.all([
    cacheRepository.deleteByPrefix(ondeHojeCachePrefixes.todayMap),
    cacheRepository.deleteByPrefix(ondeHojeCachePrefixes.topPlaces),
    cacheRepository.deleteByPrefix(ondeHojeCachePrefixes.globalRanking),
  ]);
}

export async function invalidateOndeHojeGroupCaches(cacheRepository: CacheRepository) {
  await Promise.all([
    cacheRepository.deleteByPrefix(ondeHojeCachePrefixes.publicGroups),
    cacheRepository.deleteByPrefix(ondeHojeCachePrefixes.todayMap),
    cacheRepository.deleteByPrefix(ondeHojeCachePrefixes.topPlaces),
  ]);
}
