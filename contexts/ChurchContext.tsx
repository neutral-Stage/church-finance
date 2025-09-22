'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ChurchWithRole } from '@/types/database'
import { churchApi } from '@/lib/church-aware-api'

interface ChurchContextType {
  selectedChurch: ChurchWithRole | null
  availableChurches: ChurchWithRole[]
  setSelectedChurch: (church: ChurchWithRole | null) => void
  isLoading: boolean
  error: string | null
  refreshChurches: () => Promise<void>
  api: typeof churchApi
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined)

export function useChurch() {
  const context = useContext(ChurchContext)
  if (context === undefined) {
    throw new Error('useChurch must be used within a ChurchProvider')
  }
  return context
}

// Convenience hook for church-aware API calls
export function useChurchApi() {
  const { api, selectedChurch } = useChurch()

  // Set up error handler to show church selection requirement
  React.useEffect(() => {
    api.setOnChurchRequired(() => {
      console.warn('Church context required but no church selected')
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        // Try to show toast if available
        try {
          const { toast } = require('sonner')
          toast.error('Please select a church first', {
            description: 'A church must be selected to perform this action.'
          })
        } catch {
          // Fallback to alert if toast is not available
          alert('Please select a church first')
        }
      }
    })
  }, [api])

  return {
    api,
    selectedChurch,
    hasChurchSelected: !!selectedChurch
  }
}

interface ChurchProviderProps {
  children: React.ReactNode
}

export function ChurchProvider({ children }: ChurchProviderProps) {
  const [selectedChurch, setSelectedChurchState] = useState<ChurchWithRole | null>(null)
  const [availableChurches, setAvailableChurches] = useState<ChurchWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load selected church from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedChurch')
      if (stored) {
        try {
          const parsedChurch = JSON.parse(stored) as ChurchWithRole
          setSelectedChurchState(parsedChurch)
          // Initialize the API client with the stored church
          churchApi.setSelectedChurch(parsedChurch)
        } catch (error) {
          console.error('Error parsing stored church:', error)
          localStorage.removeItem('selectedChurch')
        }
      }
      setIsInitialized(true)
    }
  }, [])

  // Fetch available churches
  const fetchChurches = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use church API but skip church validation for fetching available churches
      const response = await churchApi.get('/api/churches', { skipChurchValidation: true })
      const data = response.data

      if (response.success) {
        const userChurches = data.churches?.map((church: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          ...church,
          role: church.user_church_roles?.[0]?.roles,
          user_church_role: church.user_church_roles?.[0]
        })) || []

        setAvailableChurches(userChurches)
      } else {
        setError(response.error || 'Failed to fetch churches')
        setAvailableChurches([])
      }
    } catch (error) {
      console.error('Error fetching churches:', error)
      setError('Failed to load churches')
      setAvailableChurches([])
    } finally {
      setIsLoading(false)
    }
  }, []) // Remove selectedChurch dependency to prevent circular updates

  // Refresh churches function
  const refreshChurches = useCallback(async () => {
    await fetchChurches()
  }, [fetchChurches])

  // Set selected church with persistence
  const setSelectedChurch = useCallback((church: ChurchWithRole | null) => {
    setSelectedChurchState(church)
    // Update the API client with the new church context
    churchApi.setSelectedChurch(church)
    if (church) {
      localStorage.setItem('selectedChurch', JSON.stringify(church))
    } else {
      localStorage.removeItem('selectedChurch')
    }
  }, [])

  // Fetch churches when component mounts and is initialized
  useEffect(() => {
    if (isInitialized) {
      fetchChurches()
    }
  }, [isInitialized, fetchChurches])

  // Separate effect to validate selected church when available churches change
  useEffect(() => {
    if (availableChurches.length > 0 && selectedChurch) {
      const churchStillExists = availableChurches.find((c: ChurchWithRole) => c.id === selectedChurch.id)
      if (!churchStillExists) {
        // Clear invalid selection and auto-select first available church
        setSelectedChurchState(availableChurches[0])
        localStorage.setItem('selectedChurch', JSON.stringify(availableChurches[0]))
      } else if (churchStillExists !== selectedChurch) {
        // Update with latest data
        setSelectedChurchState(churchStillExists)
        localStorage.setItem('selectedChurch', JSON.stringify(churchStillExists))
      }
    } else if (availableChurches.length > 0 && !selectedChurch) {
      // Auto-select first church if none is selected
      const firstChurch = availableChurches[0]
      setSelectedChurchState(firstChurch)
      churchApi.setSelectedChurch(firstChurch)
      localStorage.setItem('selectedChurch', JSON.stringify(firstChurch))
    }
  }, [availableChurches, selectedChurch])

  const value: ChurchContextType = {
    selectedChurch,
    availableChurches,
    setSelectedChurch,
    isLoading,
    error,
    refreshChurches,
    api: churchApi
  }

  return (
    <ChurchContext.Provider value={value}>
      {children}
    </ChurchContext.Provider>
  )
}