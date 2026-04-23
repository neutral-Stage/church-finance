'use client'

import { useCallback } from 'react'
import { useChurch } from '@/contexts/ChurchContext'
import { supabase } from '@/lib/supabase'

/**
 * Custom hook that provides church-scoped API operations
 * Automatically includes the selected church_id in all queries
 */
export function useChurchApi() {
  const { selectedChurch } = useChurch()

  const churchQuery = useCallback((tableName: string) => {
    if (!selectedChurch) {
      throw new Error('No church selected')
    }
    return (supabase.from(tableName as any) as any).select('*').eq('church_id', selectedChurch.id)
  }, [selectedChurch])

  const churchInsert = useCallback((tableName: string, data: Record<string, any>) => {
    if (!selectedChurch) {
      throw new Error('No church selected')
    }
    return (supabase.from(tableName as any) as any).insert({
      ...data,
      church_id: selectedChurch.id
    })
  }, [selectedChurch])

  const churchUpdate = useCallback((tableName: string, data: Record<string, any>, filter: { column: string, value: any }) => {
    if (!selectedChurch) {
      throw new Error('No church selected')
    }
    return (supabase.from(tableName as any) as any)
      .update(data)
      .eq(filter.column, filter.value)
      .eq('church_id', selectedChurch.id)
  }, [selectedChurch])

  const churchDelete = useCallback((tableName: string, filter: { column: string, value: any }) => {
    if (!selectedChurch) {
      throw new Error('No church selected')
    }
    return (supabase.from(tableName as any) as any)
      .delete()
      .eq(filter.column, filter.value)
      .eq('church_id', selectedChurch.id)
  }, [selectedChurch])

  const isChurchSelected = Boolean(selectedChurch)
  const churchId = selectedChurch?.id || null
  const churchName = selectedChurch?.name || null

  return {
    selectedChurch,
    churchId,
    churchName,
    isChurchSelected,
    churchQuery,
    churchInsert,
    churchUpdate,
    churchDelete
  }
}