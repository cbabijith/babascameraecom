// src/hooks/useCachedFetch.ts
// React hook for cached API fetching - works with existing Redux setup
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient, { type ApiResponse } from "@/lib/apiClient";
import {
  getCached,
  setCache,
  isStale,
  createCacheKey,
  invalidateCache,
  CacheTTL,
} from "@/lib/apiCache";

interface UseCachedFetchOptions<T> {
  /** Time-to-live for cache in ms (default: 60s) */
  ttl?: number;
  /** Skip initial fetch (useful for conditional fetching) */
  skip?: boolean;
  /** Callback when data is fetched successfully */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Enable stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean;
}

interface UseCachedFetchResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  /** Force refetch and update cache */
  refetch: () => Promise<void>;
  /** Invalidate cache for this key */
  invalidate: () => void;
}

/**
 * Hook for fetching data with automatic caching
 * 
 * @example
 * const { data, loading, error, refetch } = useCachedFetch<Product[]>(
 *   '/api/v1/products',
 *   { category: 'cameras' },
 *   { ttl: CacheTTL.LONG }
 * );
 */
export function useCachedFetch<T>(
  url: string,
  params?: Record<string, unknown>,
  options: UseCachedFetchOptions<T> = {}
): UseCachedFetchResult<T> {
  const {
    ttl = CacheTTL.MEDIUM,
    skip = false,
    onSuccess,
    onError,
    staleWhileRevalidate = true,
  } = options;

  const paramsKey = JSON.stringify(params);
  const cacheKey = createCacheKey(url, params);
  const [data, setData] = useState<T | undefined>(() => getCached<T>(cacheKey));
  const [loading, setLoading] = useState(!data && !skip);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading && !data) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await apiClient.get<ApiResponse<T>>(url, { params });
      const result = response.data.data ?? response.data.results ?? response.data.result;
      
      if (mountedRef.current && result !== undefined) {
        setData(result as T);
        setCache(cacheKey, result, ttl);
        onSuccess?.(result as T);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error("Failed to fetch");
        setError(error);
        onError?.(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- data/params are captured per-mount by design; paramsKey covers identity
  }, [url, paramsKey, cacheKey, ttl, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (skip) {
      setLoading(false);
      return;
    }

    const cached = getCached<T>(cacheKey);
    
    if (cached) {
      setData(cached);
      setLoading(false);
      
      // If stale, refetch in background
      if (staleWhileRevalidate && isStale(cacheKey)) {
        fetchData(false);
      }
    } else {
      fetchData(true);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [cacheKey, skip, staleWhileRevalidate, fetchData]);

  const refetch = useCallback(async () => {
    invalidateCache(cacheKey);
    await fetchData(true);
  }, [cacheKey, fetchData]);

  const invalidate = useCallback(() => {
    invalidateCache(cacheKey);
  }, [cacheKey]);

  return { data, loading, error, refetch, invalidate };
}

// Re-export CacheTTL for convenience
export { CacheTTL };
