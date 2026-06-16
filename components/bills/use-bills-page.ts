'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatDateForInput } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import {
  type Bill,
  type LedgerEntry,
  type LedgerSubgroup,
  type PettyCash,
  type Fund,
  type BillFormValues,
  type PettyCashFormValues,
  type GroupedBills,
  defaultBillFormValues,
  defaultPettyCashFormValues,
} from '@/components/bills/types'

export function useBillsPage() {
  const { hasRole } = useAuth()
  const { selectedChurch } = useChurch()
  const [bills, setBills] = useState<Bill[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [ledgerSubgroups, setLedgerSubgroups] = useState<LedgerSubgroup[]>([])
  const [pettyCash, setPettyCash] = useState<PettyCash[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bills' | 'petty-cash'>('bills')
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set())
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [pettyCashDialogOpen, setPettyCashDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [editingPettyCash, setEditingPettyCash] = useState<PettyCash | null>(null)
  const [billForm, setBillForm] = useState<BillFormValues>(defaultBillFormValues)
  const [pettyCashForm, setPettyCashForm] = useState<PettyCashFormValues>(defaultPettyCashFormValues)

  const fetchLedgerEntries = useCallback(async () => {
    if (!selectedChurch) return
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('church_id', selectedChurch.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setLedgerEntries(data || [])
    } catch {
      toast.error('Failed to fetch ledger entries')
    }
  }, [selectedChurch])

  const fetchLedgerSubgroups = useCallback(async () => {
    if (!selectedChurch) return
    try {
      const { data, error } = await supabase
        .from('ledger_subgroups')
        .select(`*, ledger_entries!inner(church_id)`)
        .eq('ledger_entries.church_id', selectedChurch.id)
        .order('sort_order', { ascending: true })
      if (error) throw error
      setLedgerSubgroups(data || [])
    } catch {
      toast.error('Failed to fetch ledger subgroups')
    }
  }, [selectedChurch])

  const fetchData = useCallback(async () => {
    if (!selectedChurch) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select(`*, ledger_entries(*), ledger_subgroups(*)`)
        .eq('church_id', selectedChurch.id)
        .order('due_date', { ascending: true })
      if (billsError) throw billsError

      const { data: pettyCashData, error: pettyCashError } = await supabase
        .from('petty_cash')
        .select('*')
        .eq('church_id', selectedChurch.id)
        .order('created_at', { ascending: false })
      if (pettyCashError) throw pettyCashError

      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .eq('church_id', selectedChurch.id)
        .order('name')
      if (fundsError) throw fundsError

      await Promise.all([fetchLedgerEntries(), fetchLedgerSubgroups()])
      setBills(billsData || [])
      setPettyCash(pettyCashData || [])
      setFunds(fundsData || [])
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load bills and petty cash data'
      )
    } finally {
      setLoading(false)
    }
  }, [selectedChurch, fetchLedgerEntries, fetchLedgerSubgroups])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })
  }

  const toggleSubgroupExpansion = (subgroupId: string) => {
    setExpandedSubgroups((prev) => {
      const next = new Set(prev)
      if (next.has(subgroupId)) next.delete(subgroupId)
      else next.add(subgroupId)
      return next
    })
  }

  const groupedBills = useCallback((): GroupedBills => {
    const ungroupedBills = bills.filter((bill) => !bill.ledger_entry_id && !bill.ledger_subgroup_id)
    const entriesWithBills = ledgerEntries.map((entry) => {
      const directBills = bills.filter(
        (bill) => bill.ledger_entry_id === entry.id && !bill.ledger_subgroup_id
      )
      const entrySubgroups = ledgerSubgroups.filter((subgroup) => subgroup.ledger_entry_id === entry.id)
      const subgroupsWithBills = entrySubgroups.reduce(
        (acc, subgroup) => {
          acc[subgroup.id] = {
            subgroup,
            bills: bills.filter((bill) => bill.ledger_subgroup_id === subgroup.id) || [],
          }
          return acc
        },
        {} as Record<string, { subgroup: LedgerSubgroup; bills: Bill[] }>
      )
      return { entry, directBills, subgroups: subgroupsWithBills }
    })

    const result: GroupedBills = {}
    if (ungroupedBills.length > 0) {
      result.ungrouped = { entry: null, directBills: ungroupedBills, subgroups: {} }
    }
    entriesWithBills.forEach((entryData, index) => {
      if (entryData.directBills.length > 0 || Object.keys(entryData.subgroups).length > 0) {
        result[entryData.entry.id || `entry-${index}`] = entryData
      }
    })
    return result
  }, [bills, ledgerEntries, ledgerSubgroups])

  const resetBillForm = () => {
    setBillForm(defaultBillFormValues)
    setEditingBill(null)
  }

  const resetPettyCashForm = () => {
    setPettyCashForm({
      ...defaultPettyCashFormValues,
      transaction_date: new Date().toISOString().split('T')[0],
    })
    setEditingPettyCash(null)
  }

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!billForm.vendor_name || !billForm.amount || !billForm.due_date || !billForm.fund_id) {
      toast.error('Please fill in all required fields')
      return
    }
    const amount = parseFloat(billForm.amount)
    if (amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    try {
      const billData = {
        vendor_name: billForm.vendor_name,
        amount,
        due_date: billForm.due_date,
        fund_id: billForm.fund_id,
        category: billForm.category || 'General',
        frequency: billForm.frequency,
        status: billForm.status,
        ledger_entry_id: billForm.ledger_entry_id || null,
        ledger_subgroup_id: billForm.ledger_subgroup_id || null,
        responsible_parties: billForm.responsible_parties
          ? billForm.responsible_parties.split(',').map((p) => p.trim())
          : null,
        allocation_percentage: billForm.allocation_percentage
          ? parseFloat(billForm.allocation_percentage)
          : null,
        priority: billForm.priority,
        approval_status: billForm.approval_status,
        notes: billForm.notes || null,
      }
      if (editingBill) {
        const { error } = await supabase.from('bills').update(billData).eq('id', editingBill.id)
        if (error) throw error
        toast.success('Bill updated successfully')
      } else {
        const { error } = await supabase.from('bills').insert([billData])
        if (error) throw error
        toast.success('Bill created successfully')
      }
      setBillDialogOpen(false)
      resetBillForm()
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save bill')
    }
  }

  const handlePettyCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !pettyCashForm.amount ||
      !pettyCashForm.purpose ||
      !pettyCashForm.transaction_date ||
      !pettyCashForm.approved_by
    ) {
      toast.error('Please fill in all required fields')
      return
    }
    const amount = parseFloat(pettyCashForm.amount)
    if (amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    try {
      const pettyCashData = {
        amount,
        purpose: pettyCashForm.purpose,
        transaction_date: pettyCashForm.transaction_date,
        approved_by: pettyCashForm.approved_by,
        receipt_available: pettyCashForm.receipt_available,
      }
      if (editingPettyCash) {
        const { error } = await supabase
          .from('petty_cash')
          .update(pettyCashData)
          .eq('id', editingPettyCash.id)
        if (error) throw error
        toast.success('Petty cash updated successfully')
      } else {
        const { error } = await supabase.from('petty_cash').insert([pettyCashData])
        if (error) throw error
        toast.success('Petty cash request created successfully')
      }
      setPettyCashDialogOpen(false)
      resetPettyCashForm()
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save petty cash request')
    }
  }

  const updateBillStatus = async (billId: string, status: 'pending' | 'paid' | 'overdue') => {
    try {
      const { error } = await supabase.from('bills').update({ status }).eq('id', billId)
      if (error) throw error
      toast.success(`Bill marked as ${status}`)
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update bill status')
    }
  }

  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return
    try {
      const { error } = await supabase.from('bills').delete().eq('id', billId)
      if (error) throw error
      toast.success('Bill deleted successfully')
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete bill')
    }
  }

  const deletePettyCash = async (pettyCashId: string) => {
    if (!confirm('Are you sure you want to delete this petty cash request?')) return
    try {
      const { error } = await supabase.from('petty_cash').delete().eq('id', pettyCashId)
      if (error) throw error
      toast.success('Petty cash request deleted successfully')
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete petty cash request')
    }
  }

  const openBillDialog = (bill?: Bill) => {
    if (bill) {
      setBillForm({
        vendor_name: bill.vendor_name,
        amount: bill.amount.toString(),
        due_date: formatDateForInput(new Date(bill.due_date)),
        fund_id: bill.fund_id,
        category: bill.category || '',
        frequency: (bill.frequency as BillFormValues['frequency']) || 'one-time',
        status: (bill.status as BillFormValues['status']) || 'pending',
        ledger_entry_id: bill.ledger_entry_id || '',
        ledger_subgroup_id: bill.ledger_subgroup_id || '',
        responsible_parties: bill.responsible_parties ? bill.responsible_parties.join(', ') : '',
        allocation_percentage: bill.allocation_percentage
          ? bill.allocation_percentage.toString()
          : '',
        priority: (bill.priority as BillFormValues['priority']) || 'medium',
        approval_status: (bill.approval_status as BillFormValues['approval_status']) || 'pending',
        notes: bill.notes || '',
      })
      setEditingBill(bill)
    } else {
      resetBillForm()
    }
    setBillDialogOpen(true)
  }

  const openPettyCashDialog = (item?: PettyCash) => {
    if (item) {
      setPettyCashForm({
        amount: item.amount.toString(),
        purpose: item.purpose || '',
        transaction_date: formatDateForInput(new Date(item.transaction_date)),
        approved_by: item.approved_by || '',
        receipt_available: item.receipt_available || false,
      })
      setEditingPettyCash(item)
    } else {
      resetPettyCashForm()
    }
    setPettyCashDialogOpen(true)
  }

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date()
  const canManage = hasRole('admin')
  const overdueBills = bills.filter((bill) => bill.status !== 'paid' && isOverdue(bill.due_date))
  const pendingBills = bills.filter((bill) => bill.status === 'pending')
  const totalBillsAmount = bills
    .filter((bill) => bill.status !== 'paid')
    .reduce((sum, bill) => sum + bill.amount, 0)
  const totalPettyCashAmount = pettyCash.reduce((sum, pc) => sum + pc.amount, 0)

  return {
    bills,
    ledgerEntries,
    ledgerSubgroups,
    pettyCash,
    funds,
    loading,
    activeTab,
    setActiveTab,
    expandedEntries,
    expandedSubgroups,
    billDialogOpen,
    setBillDialogOpen,
    pettyCashDialogOpen,
    setPettyCashDialogOpen,
    editingBill,
    editingPettyCash,
    billForm,
    setBillForm,
    pettyCashForm,
    setPettyCashForm,
    toggleEntryExpansion,
    toggleSubgroupExpansion,
    groupedBills,
    handleSaveBill,
    handlePettyCashSubmit,
    updateBillStatus,
    deleteBill,
    deletePettyCash,
    openBillDialog,
    openPettyCashDialog,
    isOverdue,
    canManage,
    overdueBills,
    pendingBills,
    totalBillsAmount,
    totalPettyCashAmount,
  }
}
