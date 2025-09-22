'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { AdminApiResponse } from '@/types/admin'

interface UseAdminCrudOptions<T> {
  endpoint: string
  entityName: string
  onSuccess?: (data: T, operation: 'create' | 'update' | 'delete') => void
  onError?: (error: string, operation: 'create' | 'update' | 'delete') => void
}

interface UseAdminCrudReturn<T> {
  creating: boolean
  updating: boolean
  deleting: boolean
  isSubmitting: boolean
  create: (data: Partial<T>) => Promise<T | null>
  update: (id: string, data: Partial<T>) => Promise<T | null>
  delete: (id: string, confirmationText?: string) => Promise<boolean>
  bulkDelete: (ids: string[], confirmationText?: string) => Promise<boolean>
}

/**
 * Custom hook for managing CRUD operations in admin pages
 */
export function useAdminCrud<T extends { id: string }>({
  endpoint,
  entityName,
  onSuccess,
  onError
}: UseAdminCrudOptions<T>): UseAdminCrudReturn<T> {
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isSubmitting = creating || updating || deleting

  // Create operation
  const create = useCallback(async (data: Partial<T>): Promise<T | null> => {
    try {
      setCreating(true)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result: AdminApiResponse<T> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to create ${entityName}`)
      }

      const createdEntity = result.data!
      toast.success(`${entityName} created successfully`)
      onSuccess?.(createdEntity, 'create')
      return createdEntity

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to create ${entityName}`
      console.error(`Error creating ${entityName}:`, error)
      toast.error(errorMessage)
      onError?.(errorMessage, 'create')
      return null
    } finally {
      setCreating(false)
    }
  }, [endpoint, entityName, onSuccess, onError])

  // Update operation
  const update = useCallback(async (id: string, data: Partial<T>): Promise<T | null> => {
    try {
      setUpdating(true)

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result: AdminApiResponse<T> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to update ${entityName}`)
      }

      const updatedEntity = result.data!
      toast.success(`${entityName} updated successfully`)
      onSuccess?.(updatedEntity, 'update')
      return updatedEntity

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to update ${entityName}`
      console.error(`Error updating ${entityName}:`, error)
      toast.error(errorMessage)
      onError?.(errorMessage, 'update')
      return null
    } finally {
      setUpdating(false)
    }
  }, [endpoint, entityName, onSuccess, onError])

  // Delete operation
  const deleteEntity = useCallback(async (id: string, confirmationText?: string): Promise<boolean> => {
    const defaultConfirmation = `Are you sure you want to delete this ${entityName}? This action cannot be undone.`

    if (!confirm(confirmationText || defaultConfirmation)) {
      return false
    }

    try {
      setDeleting(true)

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result: AdminApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to delete ${entityName}`)
      }

      toast.success(`${entityName} deleted successfully`)
      onSuccess?.(({ id } as T), 'delete')
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to delete ${entityName}`
      console.error(`Error deleting ${entityName}:`, error)

      // Special handling for protected entities
      if (errorMessage.includes('Cannot delete') || errorMessage.includes('protected')) {
        toast.error(errorMessage)
      } else {
        toast.error(errorMessage)
      }

      onError?.(errorMessage, 'delete')
      return false
    } finally {
      setDeleting(false)
    }
  }, [endpoint, entityName, onSuccess, onError])

  // Bulk delete operation
  const bulkDelete = useCallback(async (ids: string[], confirmationText?: string): Promise<boolean> => {
    const defaultConfirmation = `Are you sure you want to delete ${ids.length} ${entityName}s? This action cannot be undone.`

    if (!confirm(confirmationText || defaultConfirmation)) {
      return false
    }

    try {
      setDeleting(true)

      const response = await fetch(`${endpoint}/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      })

      const result: AdminApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to delete ${entityName}s`)
      }

      toast.success(`${ids.length} ${entityName}s deleted successfully`)
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to delete ${entityName}s`
      console.error(`Error bulk deleting ${entityName}s:`, error)
      toast.error(errorMessage)
      onError?.(errorMessage, 'delete')
      return false
    } finally {
      setDeleting(false)
    }
  }, [endpoint, entityName, onError])

  return {
    creating,
    updating,
    deleting,
    isSubmitting,
    create,
    update,
    delete: deleteEntity,
    bulkDelete
  }
}