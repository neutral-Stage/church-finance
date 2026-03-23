'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ChurchWithRole } from '@/types/database'
import { churchApi } from '@/lib/church-aware-api'

interface ChurchContextType {
  selectedChurch: ChurchWithRole | null
  availableChurches: ChurchWithRole[]
  setSelectedChurch: (church: ChurchWithRole | null, skipReload?: boolean) => Promise<void>
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
  const [isUpdating, setIsUpdating] = useState(false) // Track if we're in the middle of an update

  // Load selected church from localStorage on mount and sync with server
  useEffect(() => {
    const initializeChurch = async () => {
      if (typeof window !== 'undefined') {
        // First try to load from localStorage for immediate UI update
        const stored = localStorage.getItem('selectedChurch')
        if (stored) {
          try {
            const parsedChurch = JSON.parse(stored) as ChurchWithRole
            setSelectedChurchState(parsedChurch)
            // Initialize the API client with the stored church
            churchApi.setSelectedChurch(parsedChurch)
            console.log('[ChurchContext] Loaded church from localStorage:', parsedChurch.id)
          } catch (error) {
            console.error('[ChurchContext] Error parsing stored church:', error)
            localStorage.removeItem('selectedChurch')
          }
        }

        // Then check server-side cookie for validation and sync
        try {
          console.log('[ChurchContext] Checking server cookie status...')
          const response = await fetch('/api/church-selection', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store' // Ensure we get fresh data, not cached response
          })

          if (response.ok) {
            const data = await response.json()
            const storedChurch = stored ? JSON.parse(stored) : null

            console.log('[ChurchContext] Server cookie check:', {
              hasServerChurch: !!data.church,
              serverChurchId: data.church?.id,
              hasClientChurch: !!storedChurch,
              clientChurchId: storedChurch?.id
            })

            if (data.church && (!storedChurch || data.church.id !== storedChurch.id)) {
              // Server has a different church selected, sync with it
              console.log('[ChurchContext] Server has different church, syncing to client:', data.church.id)
              setSelectedChurchState(data.church)
              churchApi.setSelectedChurch(data.church)
              localStorage.setItem('selectedChurch', JSON.stringify(data.church))
              sessionStorage.setItem('churchSyncCompleted', 'true')
            } else if (!data.church && storedChurch) {
              // Client has church but server doesn't - sync client to server
              // Only sync once per session to prevent infinite loops
              const hasSynced = sessionStorage.getItem('churchSyncAttempted')

              if (!hasSynced) {
                console.log('[ChurchContext] Client has church but server doesn\'t, syncing to server:', storedChurch.id)
                sessionStorage.setItem('churchSyncAttempted', 'true')

                const syncResponse = await fetch('/api/church-selection', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ church: storedChurch })
                })

                if (syncResponse.ok) {
                  const syncData = await syncResponse.json()
                  console.log('[ChurchContext] Cookie synced successfully:', syncData)

                  // Reload only once
                  console.log('[ChurchContext] Reloading page once to refresh server components')
                  window.location.reload()
                } else {
                  console.error('[ChurchContext] Failed to sync cookie to server:', syncResponse.status)
                  // The server rejected this church selection (likely due to permissions or session errors).
                  // Clear local state so the UI accurately shows no church is selected.
                  localStorage.removeItem('selectedChurch')
                  setSelectedChurchState(null)
                  churchApi.setSelectedChurch(null)
                }
              } else {
                console.log('[ChurchContext] Already attempted sync this session, skipping to prevent loop')
                // If we've already tried and failed to sync this session, clear local state
                // to avoid the UI showing a church that the server has rejected
                localStorage.removeItem('selectedChurch')
                setSelectedChurchState(null)
                churchApi.setSelectedChurch(null)
              }
            } else if (data.church && storedChurch && data.church.id === storedChurch.id) {
              // Server and client are already in sync
              console.log('[ChurchContext] Server and client already in sync:', storedChurch.id)
              sessionStorage.setItem('churchSyncCompleted', 'true')
            } else if (!data.church && !storedChurch) {
              // No church selected anywhere - will auto-select when churches are loaded
              console.log('[ChurchContext] No church selected on server or client')
            }
          } else {
            console.error('[ChurchContext] Failed to fetch server church selection:', response.status)
          }
        } catch (error) {
          console.error('[ChurchContext] Error syncing with server church selection:', error)
          // Continue with localStorage data even if server sync fails
        }

        setIsInitialized(true)
      }
    }

    initializeChurch()
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

  // Set selected church with persistence and server synchronization
  const setSelectedChurch = useCallback(async (church: ChurchWithRole | null, skipReload = false) => {
    // Prevent infinite loops - check if church actually changed
    if (isUpdating) {
      console.log('[ChurchContext] Already updating, skipping...')
      return
    }

    const currentChurchId = selectedChurch?.id
    const newChurchId = church?.id

    if (currentChurchId === newChurchId) {
      console.log('[ChurchContext] Church unchanged, skipping update')
      return
    }

    setIsUpdating(true)
    console.log('[ChurchContext] Changing church from', currentChurchId, 'to', newChurchId)

    // Clear sync flags when manually changing church to allow re-sync
    sessionStorage.removeItem('churchSyncAttempted')
    sessionStorage.removeItem('churchSyncCompleted')

    setSelectedChurchState(church)
    // Update the API client with the new church context
    churchApi.setSelectedChurch(church)

    // Update localStorage for immediate client-side access
    if (church) {
      localStorage.setItem('selectedChurch', JSON.stringify(church))
    } else {
      localStorage.removeItem('selectedChurch')
      // Clear the sync flag when clearing church selection
      sessionStorage.removeItem('churchSyncCompleted')
    }

    // Always synchronize with server-side cookies
    try {
      const response = await fetch('/api/church-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ church })
      })

      if (!response.ok) {
        console.error('Failed to synchronize church selection with server')
        setIsUpdating(false)
        // Still continue with client-side selection even if server sync fails
      } else {
        // Mark sync as completed
        if (church) {
          sessionStorage.setItem('churchSyncCompleted', 'true')
        }

        // Only reload if this is a manual church change (not auto-select)
        if (!skipReload && typeof window !== 'undefined') {
          console.log('[ChurchContext] Reloading page with new church context')
          window.location.reload()
        } else {
          console.log('[ChurchContext] Cookie synced, skipping reload (auto-select)')
          setIsUpdating(false)
        }
      }
    } catch (error) {
      console.error('Error synchronizing church selection:', error)
      setIsUpdating(false)
      // Still continue with client-side selection even if server sync fails
    }
  }, [selectedChurch, isUpdating])

  // Fetch churches when component mounts and is initialized
  useEffect(() => {
    if (isInitialized) {
      fetchChurches()
    }
  }, [isInitialized, fetchChurches])

  // Separate effect to validate selected church when available churches change
  useEffect(() => {
    const syncSelectedChurch = async () => {
      if (isUpdating) return // Don't sync while updating
      if (!isInitialized) return // Don't sync until initialized

      if (availableChurches.length > 0 && selectedChurch) {
        const churchStillExists = availableChurches.find((c: ChurchWithRole) => c.id === selectedChurch.id)
        if (!churchStillExists) {
          console.log('[ChurchContext] Selected church no longer exists, auto-selecting first church')
          // Clear invalid selection and auto-select first available church (skip reload)
          await setSelectedChurch(availableChurches[0], true)
        }
        // Don't update if church reference is different but ID is the same
      } else if (availableChurches.length > 0 && !selectedChurch) {
        console.log('[ChurchContext] No church selected, auto-selecting first church')
        // Auto-select first church if none is selected (skip reload on auto-select)
        await setSelectedChurch(availableChurches[0], true)
      }
    }

    syncSelectedChurch()
  }, [availableChurches, selectedChurch, setSelectedChurch, isUpdating, isInitialized])

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