"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiResponse } from "@/lib/church-aware-api";

// Pagination types
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UseDataFetchingOptions<T> {
  // Data fetching
  fetchFn: () => Promise<ApiResponse<T>>;
  dependencies?: React.DependencyList;

  // Pagination
  pagination?: PaginationOptions;

  // Caching
  cacheKey?: string;
  cacheDuration?: number; // in milliseconds

  // Callbacks
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;

  // Manual mode - don't fetch automatically
  manual?: boolean;
}

export interface UseDataFetchingReturn<T> {
  // Data
  data: T | null;
  error: string | null;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;

  // Pagination
  pagination: PaginationState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  hasMore: boolean;

  // Actions
  refetch: () => Promise<void>;
  mutate: (newData: T | ((oldData: T | null) => T)) => void;

  // Helpers
  isEmpty: boolean;
  isError: boolean;
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCachedData<T>(key: string, duration: number): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < duration) {
    return entry.data;
  }
  memoryCache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function useDataFetching<T>({
  fetchFn,
  dependencies = [],
  pagination,
  cacheKey,
  cacheDuration = 5 * 60 * 1000, // 5 minutes default
  onSuccess,
  onError,
  manual = false,
}: UseDataFetchingOptions<T>): UseDataFetchingReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!manual);
  const [isFetching, setIsFetching] = useState(false);

  const [paginationState, setPaginationState] = useState<PaginationState>({
    page: pagination?.initialPage ?? 1,
    pageSize: pagination?.initialPageSize ?? 10,
    total: 0,
  });

  // Track if component is mounted
  const isMounted = useRef(true);
  // Track current fetch to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Cancel any pending fetch on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchData = useCallback(
    async (showLoading = true) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Check cache first for GET requests
      if (cacheKey && !showLoading) {
        const cachedData = getCachedData<T>(cacheKey, cacheDuration);
        if (cachedData && isMounted.current) {
          setData(cachedData);
          return;
        }
      }

      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const response = await fetchFn();

        if (!isMounted.current) return;

        if (response.success) {
          const responseData = response.data as T;

          // Update cache
          if (cacheKey) {
            setCachedData(cacheKey, responseData);
          }

          setData(responseData);

          // Call success callback
          if (onSuccess) {
            onSuccess(responseData);
          }
        } else {
          const errorMsg = response.error || "Failed to fetch data";
          setError(errorMsg);

          // Call error callback
          if (onError) {
            onError(errorMsg);
          }
        }
      } catch (err) {
        if (!isMounted.current) return;

        // Don't set error for aborted requests
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const errorMsg =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMsg);

        if (onError) {
          onError(errorMsg);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [fetchFn, cacheKey, cacheDuration, onSuccess, onError],
  );

  // Initial fetch
  useEffect(() => {
    if (!manual) {
      fetchData();
    }
  }, dependencies);

  // Pagination handlers
  const setPage = useCallback((page: number) => {
    setPaginationState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPaginationState((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // Manual refetch
  const refetch = useCallback(async () => {
    // Clear cache for this key
    if (cacheKey) {
      memoryCache.delete(cacheKey);
    }
    await fetchData(false);
  }, [fetchData, cacheKey]);

  // Optimistic update
  const mutate = useCallback(
    (newData: T | ((oldData: T | null) => T)) => {
      setData((prevData) => {
        const updatedData =
          typeof newData === "function"
            ? (newData as (oldData: T | null) => T)(prevData)
            : newData;

        // Update cache
        if (cacheKey) {
          setCachedData(cacheKey, updatedData);
        }

        return updatedData;
      });
    },
    [cacheKey],
  );

  // Calculate hasMore
  const hasMore =
    paginationState.total > paginationState.page * paginationState.pageSize;

  return {
    data,
    error,
    isLoading,
    isFetching,
    pagination: paginationState,
    setPage,
    setPageSize,
    hasMore,
    refetch,
    mutate,
    isEmpty:
      !isLoading &&
      !error &&
      (data === null || (Array.isArray(data) && data.length === 0)),
    isError: !!error,
  };
}

// Specialized hook for list data with pagination
export function useListDataFetching<T>(options: UseDataFetchingOptions<T[]>) {
  return useDataFetching<T[]>({
    ...options,
    pagination: {
      initialPage: 1,
      initialPageSize: 10,
      ...options.pagination,
    },
  });
}

export default useDataFetching;
