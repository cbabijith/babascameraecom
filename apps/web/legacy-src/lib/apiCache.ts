// src/lib/apiCache.ts - Lightweight client-side cache for API responses
// Works alongside Redux without affecting performance

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

// In-memory cache - cleared on page refresh (intentional for fresh data)
const cache = new Map<string, CacheEntry<unknown>>();

// Default TTL values (in milliseconds)
const DEFAULT_TTL = 60 * 1000; // 1 minute
const STALE_TTL = 5 * 60 * 1000; // 5 minutes for stale-while-revalidate

// TTL presets for different data types
export const CacheTTL = {
  SHORT: 30 * 1000,      // 30 seconds - frequently changing data
  MEDIUM: 60 * 1000,     // 1 minute - default
  LONG: 5 * 60 * 1000,   // 5 minutes - rarely changing data
  STATIC: 30 * 60 * 1000 // 30 minutes - static content like categories
} as const;

/**
 * Get cached data if valid, otherwise returns undefined
 */
export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  
  const now = Date.now();
  
  // Check if completely expired (past stale TTL)
  if (now > entry.expiresAt + STALE_TTL) {
    cache.delete(key);
    return undefined;
  }
  
  return entry.data;
}

/**
 * Check if cached data is stale (expired but still usable)
 */
export function isStale(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return true;
  return Date.now() > entry.expiresAt;
}

/**
 * Set data in cache with TTL
 */
export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  });
}

/**
 * Remove specific key from cache
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Remove all keys matching a pattern (e.g., "products:" invalidates all product cache)
 */
export function invalidateCachePattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Generate cache key from URL and params
 */
export function createCacheKey(url: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  // Sort params for consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${url}?${sortedParams}`;
}

// Cache stats for debugging (optional)
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
