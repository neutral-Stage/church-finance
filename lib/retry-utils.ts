/**
 * Retry utility functions for handling network failures and Supabase connection issues
 */

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: any) => boolean
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and connection issues
    if (error?.message) {
      const message = error.message.toLowerCase()
      return (
        message.includes('failed to fetch') ||
        message.includes('network error') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('aborted') ||
        message.includes('err_network') ||
        message.includes('err_internet_disconnected')
      )
    }
    return false
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry if this is the last attempt or if retry condition is not met
      if (attempt === opts.maxAttempts || !opts.retryCondition(error)) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      )
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

/**
 * Wrapper for Supabase queries with retry logic
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => any, // Accept any Supabase query builder
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return retryWithBackoff(async () => {
    const query = queryFn()
    const result = await query
    
    // If there's a Supabase error that should be retried, throw it
    if (result.error && options.retryCondition?.(result.error)) {
      throw result.error
    }
    
    return result
  }, options)
}

/**
 * Check if an error is a network-related error that should be retried
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  const code = error.code?.toLowerCase() || ''
  
  return (
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('aborted') ||
    code.includes('err_network') ||
    code.includes('err_internet_disconnected') ||
    code.includes('err_connection_closed') ||
    code.includes('err_aborted') ||
    code.includes('err_timed_out')
  )
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
export function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`))
    }, ms)
  })
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs)
  ])
}

/**
 * Enhanced error logging for network issues
 */
export function logNetworkError(error: any, context: string) {
  console.error(`[Network Error - ${context}]:`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    timestamp: new Date().toISOString(),
    isNetworkError: isNetworkError(error)
  })
}