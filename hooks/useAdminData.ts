'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { debounce } from '@/lib/utils'
import { AdminFilters, AdminApiResponse } from '@/types/admin'

interface UseAdminDataOptions<T, F extends AdminFilters> {
  endpoint: string
  initialFilters: F
  searchFields?: (keyof T)[]
  dependencies?: any[]
  pollInterval?: number
  cacheKey?: string
}

interface UseAdminDataReturn<T, F extends AdminFilters> {
  data: T[]
  loading: boolean
  error: string
  filters: F
  setFilters: (filters: Partial<F>) => void
  refetch: () => Promise<void>
  filteredData: T[]
  totalCount: number
  isEmpty: boolean
  clearError: () => void
}

/**
 * Custom hook for managing admin data with filtering, searching, and caching
 */
export function useAdminData<T, F extends AdminFilters>({
  endpoint,
  initialFilters,
  searchFields = [],
  dependencies = [],
  pollInterval,
  cacheKey
}: UseAdminDataOptions<T, F>): UseAdminDataReturn<T, F> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFiltersState] = useState<F>(initialFilters)

  // Cache management
  const cache = useMemo(() => {
    if (typeof window === 'undefined' || !cacheKey) return null
    const cached = sessionStorage.getItem(`admin_cache_${cacheKey}`)
    return cached ? JSON.parse(cached) : null
  }, [cacheKey])

  const setCacheData = useCallback((newData: T[]) => {
    if (typeof window === 'undefined' || !cacheKey) return
    sessionStorage.setItem(`admin_cache_${cacheKey}`, JSON.stringify({
      data: newData,
      timestamp: Date.now()
    }))
  }, [cacheKey])

  const isCacheValid = useCallback(() => {
    if (!cache) return false
    const MAX_CACHE_AGE = 5 * 60 * 1000 // 5 minutes
    return Date.now() - cache.timestamp < MAX_CACHE_AGE
  }, [cache])

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Use cache if valid
      if (cache && isCacheValid()) {
        setData(cache.data)
        setLoading(false)
        return
      }

      const params = new URLSearchParams()

      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && key !== 'search' && key !== 'sortBy' && key !== 'sortOrder') {
          params.append(key, String(value))
        }
      })

      if (filters.search) {
        params.append('search', filters.search)
      }

      const response = await fetch(`${endpoint}?${params.toString()}`)
      const result: AdminApiResponse<T[]> = await response.json()

      if (response.ok) {
        const newData = result.data || []
        setData(newData)
        setCacheData(newData)
        setError('')
      } else {
        if (response.status === 401) {
          setError('Please sign in to access this page')
        } else if (response.status === 403) {
          setError('You do not have permission to access this data')
        } else {
          setError(result.error || 'Failed to fetch data')
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err)
      setError('Unable to connect to the server. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [endpoint, filters, cache, isCacheValid, setCacheData])

  // Debounced fetch for search
  const debouncedFetch = useMemo(
    () => debounce(fetchData, 300),
    [fetchData]
  )

  // Filter management
  const setFilters = useCallback((newFilters: Partial<F>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters }

      // Clear cache when filters change (except search)
      if (cacheKey && Object.keys(newFilters).some(key => key !== 'search')) {
        sessionStorage.removeItem(`admin_cache_${cacheKey}`)
      }

      return updated
    })
  }, [cacheKey])

  // Client-side filtering and sorting
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (filters.search && searchFields.length > 0) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field]
          return value && String(value).toLowerCase().includes(searchTerm)
        })
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof T]
      const bValue = b[filters.sortBy as keyof T]

      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1

      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [data, filters, searchFields])

  // Clear error
  const clearError = useCallback(() => {
    setError('')
  }, [])

  // Initial fetch and dependencies
  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  // Debounced search
  useEffect(() => {
    if (filters.search !== initialFilters.search) {
      debouncedFetch()
    }
  }, [filters.search, debouncedFetch, initialFilters.search])

  // Polling
  useEffect(() => {
    if (!pollInterval) return

    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [fetchData, pollInterval])

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchData,
    filteredData,
    totalCount: data.length,
    isEmpty: data.length === 0 && !loading,
    clearError
  }
}