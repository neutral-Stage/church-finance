'use client'

// Church-aware API wrapper that automatically includes selected church_id in requests
import { ChurchWithRole } from '@/types/database'

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ChurchAwareApiOptions extends RequestInit {
  method?: ApiMethod
  requireChurch?: boolean
  skipChurchValidation?: boolean
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
  status: number
}

class ChurchAwareApiClient {
  private selectedChurch: ChurchWithRole | null = null
  private onChurchRequired?: () => void

  setSelectedChurch(church: ChurchWithRole | null) {
    this.selectedChurch = church
    // Store in localStorage for persistence across page reloads
    if (church) {
      localStorage.setItem('selectedChurch', JSON.stringify(church))
    } else {
      localStorage.removeItem('selectedChurch')
    }
  }

  getSelectedChurch(): ChurchWithRole | null {
    if (this.selectedChurch) {
      return this.selectedChurch
    }

    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedChurch')
      if (stored) {
        try {
          this.selectedChurch = JSON.parse(stored)
          return this.selectedChurch
        } catch (error) {
          console.error('Error parsing stored church:', error)
          localStorage.removeItem('selectedChurch')
        }
      }
    }

    return null
  }

  setOnChurchRequired(callback: () => void) {
    this.onChurchRequired = callback
  }

  private handleChurchRequired() {
    if (this.onChurchRequired) {
      this.onChurchRequired()
    } else {
      console.warn('No church selected and no church required handler set')
      // You could also show a toast notification here
      if (typeof window !== 'undefined' && 'toast' in window) {
        // If using sonner or similar toast library
        (window as any).toast?.error?.('Please select a church first')
      }
    }
  }

  async request<T = any>(
    url: string,
    options: ChurchAwareApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      requireChurch = true,
      skipChurchValidation = false,
      method = 'GET',
      headers = {},
      body,
      ...restOptions
    } = options

    // Get current church
    const currentChurch = this.getSelectedChurch()

    // Check if church is required
    if (requireChurch && !currentChurch && !skipChurchValidation) {
      this.handleChurchRequired()
      return {
        success: false,
        status: 400,
        error: 'No church selected. Please select a church first.'
      }
    }

    // Prepare headers
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers
    }

    // Add church context to headers
    if (currentChurch) {
      (requestHeaders as any)['X-Church-ID'] = currentChurch.id;
      (requestHeaders as any)['X-Church-Role'] = currentChurch.role?.name || ''
    }

    // For GET requests, add church_id to query params
    let finalUrl = url
    if (currentChurch && method === 'GET' && !skipChurchValidation) {
      const separator = url.includes('?') ? '&' : '?'
      finalUrl = `${url}${separator}church_id=${currentChurch.id}`
    }

    // For POST/PUT/PATCH requests, add church_id to body if it's JSON
    let finalBody = body
    if (currentChurch && ['POST', 'PUT', 'PATCH'].includes(method) && !skipChurchValidation) {
      if (typeof body === 'string') {
        try {
          const bodyData = JSON.parse(body)
          bodyData.church_id = currentChurch.id
          finalBody = JSON.stringify(bodyData)
        } catch (error) {
          // If body is not JSON, keep it as is
          finalBody = body
        }
      } else if (body && typeof body === 'object') {
        finalBody = JSON.stringify({
          ...body,
          church_id: currentChurch.id
        })
      } else if (!body) {
        finalBody = JSON.stringify({ church_id: currentChurch.id })
      }
    }

    try {
      const response = await fetch(finalUrl, {
        method,
        headers: requestHeaders,
        body: finalBody,
        credentials: 'include',
        ...restOptions
      })

      let responseData: any
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      return {
        data: responseData,
        success: response.ok,
        status: response.status,
        error: response.ok ? undefined : responseData?.error || responseData || 'Request failed'
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  // Convenience methods
  async get<T = any>(url: string, options?: Omit<ChurchAwareApiOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T = any>(url: string, data?: any, options?: Omit<ChurchAwareApiOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T = any>(url: string, data?: any, options?: Omit<ChurchAwareApiOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T = any>(url: string, data?: any, options?: Omit<ChurchAwareApiOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T = any>(url: string, options?: Omit<ChurchAwareApiOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }
}

// Create singleton instance
export const churchApi = new ChurchAwareApiClient()

// React hook for using church-aware API
export function useChurchApi() {
  return churchApi
}