'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDateForInput } from '@/lib/utils'
import { Plus, Trash2, Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Database, Fund } from '@/types/database'

type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row']
type LedgerSubgroup = Database['public']['Tables']['ledger_subgroups']['Row']
type Bill = Database['public']['Tables']['bills']['Row']
type DocumentAttachment = Database['public']['Tables']['document_attachments']['Row']

interface LedgerSubgroupWithBills extends LedgerSubgroup {
  bills?: Bill[]
}

interface LedgerEntryWithRelations extends LedgerEntry {
  ledger_subgroups?: LedgerSubgroupWithBills[]
  bills?: Bill[]
}

interface BillForm {
  vendor_name: string
  amount: string
  due_date: string
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
  category: string
  fund_id: string
  notes: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  document?: File | null
  // Existing document information from database
  existingDocument?: {
    url: string
    name: string
    size: number
    type: string
    uploadedAt: string
  } | null
}

interface SubgroupForm {
  title: string
  description: string
  purpose: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  default_due_date: string
  allocation_percentage: string
  notes: string
  bills: BillForm[]
}

interface EntryForm {
  title: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  approval_status: 'pending' | 'approved' | 'rejected'
  responsible_parties: string[]
  default_due_date: string
  notes: string
  subgroupsEnabled: boolean
  subgroups: SubgroupForm[]
  directBills: BillForm[]
}

interface ComprehensiveLedgerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingEntry?: LedgerEntry | null
  onSave: () => void
}

interface UploadProgress {
  [key: string]: {
    progress: number
    status: 'uploading' | 'success' | 'error'
    error?: string
  }
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

const isImageFile = (type: string): boolean => {
  return IMAGE_TYPES.includes(type.toLowerCase())
}

const getDocumentUrl = async (path: string): Promise<string> => {
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600) // 1 hour expiry
  return data?.signedUrl || ''
}

const downloadDocument = async (path: string, filename: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(path)
    
    if (error) throw error
    
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading document:', error)
    toast.error('Failed to download document')
  }
}

export function ComprehensiveLedgerDialog({
  open,
  onOpenChange,
  editingEntry,
  onSave
}: ComprehensiveLedgerDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [funds, setFunds] = useState<Fund[]>([])
  const [responsiblePartyInput, setResponsiblePartyInput] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  
  const [entryForm, setEntryForm] = useState<EntryForm>({
    title: '',
    description: '',
    status: 'draft',
    priority: 'medium',
    approval_status: 'pending',
    responsible_parties: [],
    default_due_date: '',
    notes: '',
    subgroupsEnabled: false,
    subgroups: [],
    directBills: []
  })


  useEffect(() => {
    if (open) {
      fetchFunds()
      if (editingEntry) {
        loadEntryData()
      } else {
        resetForm()
      }
    }
  }, [open, editingEntry])

  const fetchFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .order('name')

      if (error) throw error
      setFunds(data || [])
    } catch (error) {
      console.error('Error fetching funds:', error)
      toast.error('Failed to load funds')
    }
  }

  const loadEntryData = async () => {
    if (!editingEntry) return

    try {
      setLoading(true)

      // Fetch entry with subgroups and bills
      const { data: entryData, error: entryError } = await supabase
        .from('ledger_entries')
        .select(`
          *,
          ledger_subgroups(
            *,
            bills(*)
          ),
          bills(*)
        `)
        .eq('id', editingEntry.id)
        .single()

      if (entryError) throw entryError

      const entry = entryData as LedgerEntryWithRelations
      const hasSubgroups = entry.ledger_subgroups && entry.ledger_subgroups.length > 0

      setEntryForm({
        title: entry.title,
        description: entry.description || '',
        status: entry.status,
        priority: entry.priority,
        approval_status: entry.approval_status,
        responsible_parties: entry.responsible_parties || [],
        default_due_date: entry.default_due_date ? formatDateForInput(new Date(entry.default_due_date)) : '',
        notes: entry.notes || '',
        subgroupsEnabled: Boolean(hasSubgroups),
        subgroups: hasSubgroups ? entry.ledger_subgroups!.map(subgroup => ({
          title: subgroup.title,
          description: subgroup.description || '',
          purpose: subgroup.purpose || '',
          status: subgroup.status,
          priority: subgroup.priority,
          default_due_date: subgroup.default_due_date ? formatDateForInput(new Date(subgroup.default_due_date)) : '',
          allocation_percentage: subgroup.allocation_percentage?.toString() || '',
          notes: subgroup.notes || '',
          bills: (subgroup.bills || []).map(bill => ({
            vendor_name: bill.vendor_name,
            amount: bill.amount.toString(),
            due_date: formatDateForInput(new Date(bill.due_date)),
            frequency: bill.frequency,
            category: bill.category,
            fund_id: bill.fund_id,
            notes: bill.notes || '',
            priority: bill.priority,
            document: null,
            existingDocument: bill.document_url ? {
              url: bill.document_url,
              name: bill.document_name || 'Unknown Document',
              size: bill.document_size || 0,
              type: bill.document_type || 'application/octet-stream',
              uploadedAt: bill.document_uploaded_at || ''
            } : null
          }))
        })) : [],
        directBills: !hasSubgroups ? (entry.bills || []).map(bill => ({
          vendor_name: bill.vendor_name,
          amount: bill.amount.toString(),
          due_date: formatDateForInput(new Date(bill.due_date)),
          frequency: bill.frequency,
          category: bill.category,
          fund_id: bill.fund_id,
          notes: bill.notes || '',
          priority: bill.priority,
          document: null,
          existingDocument: bill.document_url ? {
            url: bill.document_url,
            name: bill.document_name || 'Unknown Document',
            size: bill.document_size || 0,
            type: bill.document_type || 'application/octet-stream',
            uploadedAt: bill.document_uploaded_at || ''
          } : null
        })) : []
      })
    } catch (error) {
      console.error('Error loading entry data:', error)
      toast.error('Failed to load entry data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEntryForm({
      title: '',
      description: '',
      status: 'draft',
      priority: 'medium',
      approval_status: 'pending',
      responsible_parties: [],
      default_due_date: '',
      notes: '',
      subgroupsEnabled: false,
      subgroups: [],
      directBills: []
    })
    setResponsiblePartyInput('')
    setUploadProgress({})
  }

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, Word, Excel, or image files.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size too large. Maximum size is 10MB.'
    }
    return null
  }

  const uploadDocument = async (file: File, billId: string): Promise<string | null> => {
    const uploadId = `${billId}-${Date.now()}`
    
    try {
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { progress: 0, status: 'uploading' }
      }))

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `bill-documents/${fileName}`

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[uploadId]?.progress || 0
          if (current < 90) {
            return {
              ...prev,
              [uploadId]: { ...prev[uploadId], progress: current + 10 }
            }
          }
          return prev
        })
      }, 100)

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      clearInterval(progressInterval)

      if (uploadError) throw uploadError

      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { progress: 100, status: 'success' }
      }))

      // Clean up progress after success
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[uploadId]
          return newProgress
        })
      }, 2000)

      return filePath
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { 
          progress: 0, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        }
      }))
      return null
    }
  }

  const handleFileUpload = (file: File, billIndex: number, isSubgroup: boolean, subgroupIndex?: number) => {
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    // Visible test mechanism
    alert(`🔄 File upload triggered: ${file.name} (${file.size} bytes)`);
    
    console.debug('🔄 handleFileUpload called:', {
      fileName: file.name,
      fileSize: file.size,
      billIndex,
      isSubgroup,
      subgroupIndex
    })

    // Log current state before update
    console.debug('📊 Current state before update:', {
      directBillsCount: entryForm.directBills.length,
      subgroupsCount: entryForm.subgroups.length,
      targetBill: isSubgroup && subgroupIndex !== undefined 
        ? entryForm.subgroups[subgroupIndex]?.bills[billIndex]
        : entryForm.directBills[billIndex]
    })

    if (isSubgroup && subgroupIndex !== undefined) {
      setEntryForm(prev => {
        const updated = {
          ...prev,
          subgroups: prev.subgroups.map((subgroup, sIdx) => 
            sIdx === subgroupIndex
              ? {
                  ...subgroup,
                  bills: subgroup.bills.map((bill, bIdx) => 
                    bIdx === billIndex ? { ...bill, document: file, existingDocument: null } : bill
                  )
                }
              : subgroup
          )
        }
        console.debug('🔄 Updated subgroup state:', {
          subgroupIndex,
          billIndex,
          updatedBill: updated.subgroups[subgroupIndex].bills[billIndex],
          hasDocument: !!updated.subgroups[subgroupIndex].bills[billIndex].document,
          documentName: updated.subgroups[subgroupIndex].bills[billIndex].document?.name
        })
        return updated
      })
    } else {
      setEntryForm(prev => {
        const updated = {
          ...prev,
          directBills: prev.directBills.map((bill, bIdx) => 
            bIdx === billIndex ? { ...bill, document: file, existingDocument: null } : bill
          )
        }
        console.debug('🔄 Updated direct bills state:', {
          billIndex,
          updatedBill: updated.directBills[billIndex],
          hasDocument: !!updated.directBills[billIndex].document,
          documentName: updated.directBills[billIndex].document?.name
        })
        return updated
      })
    }

    toast.success(`Document "${file.name}" attached successfully`)
  }

  const handleDocumentRemove = (billIndex: number, isSubgroup: boolean, subgroupIndex?: number) => {
    if (isSubgroup && subgroupIndex !== undefined) {
      setEntryForm(prev => ({
        ...prev,
        subgroups: prev.subgroups.map((subgroup, sIdx) => 
          sIdx === subgroupIndex
            ? {
                ...subgroup,
                bills: subgroup.bills.map((bill, bIdx) => 
                  bIdx === billIndex ? { ...bill, document: null, existingDocument: null } : bill
                )
              }
            : subgroup
        )
      }))
    } else {
      setEntryForm(prev => ({
        ...prev,
        directBills: prev.directBills.map((bill, bIdx) => 
          bIdx === billIndex ? { ...bill, document: null, existingDocument: null } : bill
        )
      }))
    }
  }

  const addResponsibleParty = () => {
    if (responsiblePartyInput.trim() && !entryForm.responsible_parties.includes(responsiblePartyInput.trim())) {
      setEntryForm(prev => ({
        ...prev,
        responsible_parties: [...prev.responsible_parties, responsiblePartyInput.trim()]
      }))
      setResponsiblePartyInput('')
    }
  }

  const removeResponsibleParty = (index: number) => {
    setEntryForm(prev => ({
      ...prev,
      responsible_parties: prev.responsible_parties.filter((_, i) => i !== index)
    }))
  }

  const addSubgroup = () => {
    setEntryForm(prev => ({
      ...prev,
      subgroups: [...prev.subgroups, {
        title: '',
        description: '',
        purpose: '',
        status: 'draft',
        priority: 'medium',
        default_due_date: '',
        allocation_percentage: '',
        notes: '',
        bills: []
      }]
    }))
  }

  const removeSubgroup = (index: number) => {
    setEntryForm(prev => ({
      ...prev,
      subgroups: prev.subgroups.filter((_, i) => i !== index)
    }))
  }

  const addBill = (isSubgroup: boolean, subgroupIndex?: number) => {
    const newBill: BillForm = {
      vendor_name: '',
      amount: '',
      due_date: '',
      frequency: 'one-time',
      category: '',
      fund_id: funds[0]?.id || '',
      notes: '',
      priority: 'medium',
      document: null
    }

    if (isSubgroup && subgroupIndex !== undefined) {
      setEntryForm(prev => ({
        ...prev,
        subgroups: prev.subgroups.map((subgroup, index) => 
          index === subgroupIndex
            ? { ...subgroup, bills: [...subgroup.bills, newBill] }
            : subgroup
        )
      }))
    } else {
      setEntryForm(prev => ({
        ...prev,
        directBills: [...prev.directBills, newBill]
      }))
    }
  }

  const removeBill = (billIndex: number, isSubgroup: boolean, subgroupIndex?: number) => {
    if (isSubgroup && subgroupIndex !== undefined) {
      setEntryForm(prev => ({
        ...prev,
        subgroups: prev.subgroups.map((subgroup, sIdx) => 
          sIdx === subgroupIndex
            ? { ...subgroup, bills: subgroup.bills.filter((_, bIdx) => bIdx !== billIndex) }
            : subgroup
        )
      }))
    } else {
      setEntryForm(prev => ({
        ...prev,
        directBills: prev.directBills.filter((_, bIdx) => bIdx !== billIndex)
      }))
    }
  }

  const handleSubgroupToggle = (enabled: boolean) => {
    if (!enabled && entryForm.subgroups.length > 0) {
      // Move all bills from subgroups to direct bills
      const allBills = entryForm.subgroups.flatMap(subgroup => subgroup.bills)
      setEntryForm(prev => ({
        ...prev,
        subgroupsEnabled: false,
        subgroups: [],
        directBills: [...prev.directBills, ...allBills]
      }))
      toast.info('Bills moved from subgroups to main entry')
    } else {
      setEntryForm(prev => ({
        ...prev,
        subgroupsEnabled: enabled
      }))
    }
  }

  const handleSave = async () => {
    if (!entryForm.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!user) {
      toast.error('User not authenticated')
      return
    }

    try {
      setLoading(true)

      // Calculate total amount
      const totalAmount = entryForm.subgroupsEnabled
        ? entryForm.subgroups.reduce((sum, subgroup) => 
            sum + subgroup.bills.reduce((billSum, bill) => billSum + (parseFloat(bill.amount) || 0), 0), 0
          )
        : entryForm.directBills.reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0)

      const entryData = {
        title: entryForm.title,
        description: entryForm.description || null,
        status: entryForm.status,
        priority: entryForm.priority,
        approval_status: entryForm.approval_status,
        responsible_parties: entryForm.responsible_parties.length > 0 ? entryForm.responsible_parties : null,
        default_due_date: entryForm.default_due_date || null,
        total_amount: totalAmount,
        notes: entryForm.notes || null,
        metadata: { subgroupsEnabled: entryForm.subgroupsEnabled },
        created_by: user.id,
        updated_at: new Date().toISOString()
      }

      let entryId: string

      if (editingEntry) {
        const { error } = await supabase
          .from('ledger_entries')
          .update(entryData)
          .eq('id', editingEntry.id)

        if (error) throw error
        entryId = editingEntry.id
        toast.success('Ledger entry updated successfully')
      } else {
        const { data, error } = await supabase
          .from('ledger_entries')
          .insert([entryData])
          .select()
          .single()

        if (error) throw error
        entryId = data.id
        toast.success('Ledger entry created successfully')
      }

      // Handle subgroups and bills
      if (entryForm.subgroupsEnabled) {
        // Delete existing subgroups if editing
        if (editingEntry) {
          await supabase
            .from('ledger_subgroups')
            .delete()
            .eq('ledger_entry_id', entryId)
        }

        // Create new subgroups
        for (const [index, subgroup] of entryForm.subgroups.entries()) {
          if (!subgroup.title.trim()) continue

          const subgroupData = {
            ledger_entry_id: entryId,
            title: subgroup.title,
            description: subgroup.description || null,
            purpose: subgroup.purpose || null,
            status: subgroup.status,
            priority: subgroup.priority,
            default_due_date: subgroup.default_due_date || null,
            allocation_percentage: subgroup.allocation_percentage ? parseFloat(subgroup.allocation_percentage) : null,
            sort_order: index,
            notes: subgroup.notes || null,
            metadata: {},
            created_by: user.id
          }

          const { data: subgroupResult, error: subgroupError } = await supabase
            .from('ledger_subgroups')
            .insert([subgroupData])
            .select()
            .single()

          if (subgroupError) throw subgroupError

          // Create bills for this subgroup
          for (const [billIndex, bill] of subgroup.bills.entries()) {
            if (!bill.vendor_name.trim() || !bill.amount) continue

            let documentPath = null
            if (bill.document) {
              documentPath = await uploadDocument(bill.document, `subgroup-${subgroupResult.id}-bill-${billIndex}`)
            }

            const billData = {
              vendor_name: bill.vendor_name,
              amount: parseFloat(bill.amount),
              due_date: bill.due_date,
              frequency: bill.frequency,
              category: bill.category,
              fund_id: bill.fund_id,
              ledger_entry_id: entryId,
              ledger_subgroup_id: subgroupResult.id,
              priority: bill.priority,
              sort_order: billIndex,
              notes: bill.notes || null,
              metadata: {},
              document_url: documentPath,
              document_name: documentPath ? (bill.document?.name || null) : null,
              document_size: documentPath ? (bill.document?.size || null) : null,
              document_type: documentPath ? (bill.document?.type || null) : null,
              document_uploaded_at: documentPath ? new Date().toISOString() : null
            }

            const { error: billError } = await supabase
              .from('bills')
              .insert([billData])

            if (billError) throw billError
          }
        }
      } else {
        // Delete existing bills if editing
        if (editingEntry) {
          await supabase
            .from('bills')
            .delete()
            .eq('ledger_entry_id', entryId)
        }

        // Create direct bills
        for (const [index, bill] of entryForm.directBills.entries()) {
          if (!bill.vendor_name.trim() || !bill.amount) continue

          let documentPath = null
          if (bill.document) {
            documentPath = await uploadDocument(bill.document, `entry-${entryId}-bill-${index}`)
          }

          const billData = {
            vendor_name: bill.vendor_name,
            amount: parseFloat(bill.amount),
            due_date: bill.due_date,
            frequency: bill.frequency,
            category: bill.category,
            fund_id: bill.fund_id,
            ledger_entry_id: entryId,
            ledger_subgroup_id: null,
            priority: bill.priority,
            sort_order: index,
            notes: bill.notes || null,
            metadata: {},
            document_url: documentPath,
            document_name: documentPath ? (bill.document?.name || null) : null,
            document_size: documentPath ? (bill.document?.size || null) : null,
            document_type: documentPath ? (bill.document?.type || null) : null,
            document_uploaded_at: documentPath ? new Date().toISOString() : null
          }

          const { error: billError } = await supabase
            .from('bills')
            .insert([billData])

          if (billError) throw billError
        }
      }

      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving entry:', error)
      toast.error('Failed to save ledger entry')
    } finally {
      setLoading(false)
    }
  }

  const DocumentDisplay = ({ 
    bill, 
    billIndex, 
    isSubgroup, 
    subgroupIndex, 
    uploadId 
  }: { 
    bill: BillForm
    billIndex: number
    isSubgroup: boolean
    subgroupIndex?: number
    uploadId: string
  }) => {
    console.debug('🎯 DocumentDisplay component rendered for uploadId:', uploadId)
    const [imageUrl, setImageUrl] = useState<string>('')
    const progress = uploadProgress[uploadId]
    const hasNewDocument = bill.document
    const hasExistingDocument = bill.existingDocument
    const hasAnyDocument = hasNewDocument || hasExistingDocument
    
    // Debug logging
    console.debug(`📋 DocumentDisplay rendered - uploadId: ${uploadId}`, {
      hasNewDocument: !!hasNewDocument,
      hasExistingDocument: !!hasExistingDocument,
      hasAnyDocument,
      documentName: hasNewDocument ? hasNewDocument.name : (hasExistingDocument ? hasExistingDocument.name : 'none'),
      billDocument: bill.document,
      billExistingDocument: bill.existingDocument
    })
    console.debug('🎯 DocumentDisplay component is being rendered for uploadId:', uploadId)



    useEffect(() => {
      if (hasExistingDocument && isImageFile(hasExistingDocument.type)) {
        getDocumentUrl(hasExistingDocument.url).then(setImageUrl)
      }
    }, [hasExistingDocument])

    const handleDocumentClick = async () => {
      if (hasNewDocument) {
        // For new uploads, create object URL for preview
        const url = URL.createObjectURL(hasNewDocument)
        if (isImageFile(hasNewDocument.type)) {
          window.open(url, '_blank')
        } else {
          const a = document.createElement('a')
          a.href = url
          a.download = hasNewDocument.name
          a.click()
        }
        URL.revokeObjectURL(url)
      } else if (hasExistingDocument) {
        if (isImageFile(hasExistingDocument.type)) {
          const url = await getDocumentUrl(hasExistingDocument.url)
          window.open(url, '_blank')
        } else {
          await downloadDocument(hasExistingDocument.url, hasExistingDocument.name)
        }
      }
    }

    const getDocumentPreview = () => {
      if (hasNewDocument) {
        if (isImageFile(hasNewDocument.type)) {
          const url = URL.createObjectURL(hasNewDocument)
          return (
            <img 
              src={url} 
              alt={hasNewDocument.name}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleDocumentClick}
            />
          )
        } else {
          return (
            <div 
              className="w-16 h-16 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
              onClick={handleDocumentClick}
            >
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          )
        }
      } else if (hasExistingDocument) {
        if (isImageFile(hasExistingDocument.type) && imageUrl) {
          return (
            <img 
              src={imageUrl} 
              alt={hasExistingDocument.name}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleDocumentClick}
            />
          )
        } else {
          return (
            <div 
              className="w-16 h-16 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
              onClick={handleDocumentClick}
            >
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          )
        }
      }
      return null
    }

    if (hasAnyDocument) {
      const documentName = hasNewDocument ? hasNewDocument.name : hasExistingDocument!.name
      const documentSize = hasNewDocument ? hasNewDocument.size : hasExistingDocument!.size
      
      return (
        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">

          {getDocumentPreview()}
          <div className="flex-1">
            <p className="text-sm font-medium text-white cursor-pointer hover:text-blue-400 transition-colors" onClick={handleDocumentClick}>
              {documentName}
            </p>
            <p className="text-xs text-white/60">
              {(documentSize / 1024 / 1024).toFixed(2)} MB
              {hasExistingDocument && !hasNewDocument && (
                <span className="ml-2 text-green-400">• Uploaded</span>
              )}
              {hasNewDocument && (
                <span className="ml-2 text-blue-400">• New</span>
              )}
            </p>
          </div>
          {progress && (
            <div className="flex items-center gap-2">
              {progress.status === 'uploading' && (
                <div className="w-16 bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              {progress.status === 'success' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              {progress.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
            </div>
          )}
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById(`file-${uploadId}`)?.click()}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              title="Replace document"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDocumentRemove(billIndex, isSubgroup, subgroupIndex)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
              title="Remove document"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/30 transition-colors">
        
        <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
        <p className="text-sm text-white/60 mb-2">Upload document (PDF, Word, Excel, Images)</p>
        <p className="text-xs text-white/40 mb-3">Maximum file size: 10MB</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            console.debug('🔘 Choose File button clicked for uploadId:', uploadId)
            const fileInput = document.getElementById(`file-${uploadId}`)
            console.debug('📁 File input element found:', !!fileInput)
            fileInput?.click()
          }}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose File
        </Button>
      </div>
    )
  }

  const renderBillForm = (bill: BillForm, billIndex: number, isSubgroup: boolean, subgroupIndex?: number) => {
    // Debug logging for renderBillForm
    console.log(`🔍 renderBillForm called - uploadId: ${isSubgroup ? `subgroup-${subgroupIndex}-bill-${billIndex}` : `direct-bill-${billIndex}`}`, {
      billDocument: bill.document,
      billExistingDocument: bill.existingDocument,
      hasDocument: !!bill.document,
      hasExistingDocument: !!bill.existingDocument
    })
    
    const updateBill = (field: keyof BillForm, value: string | File | null) => {
      if (isSubgroup && subgroupIndex !== undefined) {
        setEntryForm(prev => ({
          ...prev,
          subgroups: prev.subgroups.map((subgroup, sIdx) => 
            sIdx === subgroupIndex
              ? {
                  ...subgroup,
                  bills: subgroup.bills.map((b, bIdx) => 
                    bIdx === billIndex ? { ...b, [field]: value } : b
                  )
                }
              : subgroup
          )
        }))
      } else {
        setEntryForm(prev => ({
          ...prev,
          directBills: prev.directBills.map((b, bIdx) => 
            bIdx === billIndex ? { ...b, [field]: value } : b
          )
        }))
      }
    }

    const uploadId = isSubgroup ? `subgroup-${subgroupIndex}-bill-${billIndex}` : `direct-bill-${billIndex}`
    const progress = uploadProgress[uploadId]

    return (
      <Card key={billIndex} className="bg-white/5 backdrop-blur-sm border border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white">Bill {billIndex + 1}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeBill(billIndex, isSubgroup, subgroupIndex)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`vendor-${uploadId}`} className="text-white/90">Vendor Name *</Label>
              <Input
                id={`vendor-${uploadId}`}
                value={bill.vendor_name}
                onChange={(e) => updateBill('vendor_name', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Enter vendor name"
                required
              />
            </div>
            <div>
              <Label htmlFor={`amount-${uploadId}`} className="text-white/90">Amount *</Label>
              <Input
                id={`amount-${uploadId}`}
                type="number"
                step="0.01"
                value={bill.amount}
                onChange={(e) => updateBill('amount', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor={`due-date-${uploadId}`} className="text-white/90">Due Date</Label>
              <Input
                id={`due-date-${uploadId}`}
                type="date"
                value={bill.due_date}
                onChange={(e) => updateBill('due_date', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor={`frequency-${uploadId}`} className="text-white/90">Frequency</Label>
              <Select value={bill.frequency} onValueChange={(value) => updateBill('frequency', value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`category-${uploadId}`} className="text-white/90">Category</Label>
              <Input
                id={`category-${uploadId}`}
                value={bill.category}
                onChange={(e) => updateBill('category', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Enter category"
              />
            </div>
            <div>
              <Label htmlFor={`fund-${uploadId}`} className="text-white/90">Fund</Label>
              <Select value={bill.fund_id} onValueChange={(value) => updateBill('fund_id', value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`priority-${uploadId}`} className="text-white/90">Priority</Label>
              <Select value={bill.priority} onValueChange={(value) => updateBill('priority', value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <Label className="text-white/90">Document Attachment</Label>
            <div className="mt-2">
              <DocumentDisplay 
                bill={bill}
                billIndex={billIndex}
                isSubgroup={isSubgroup}
                subgroupIndex={subgroupIndex}
                uploadId={uploadId}
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                onChange={(e) => {
                  console.debug('📂 File input onChange triggered for uploadId:', uploadId)
                  const file = e.target.files?.[0]
                  console.debug('📄 Selected file:', file ? { name: file.name, size: file.size, type: file.type } : 'No file selected')
                  if (file) {
                    console.debug('🚀 Calling handleFileUpload with:', { file: file.name, billIndex, isSubgroup, subgroupIndex })
                    handleFileUpload(file, billIndex, isSubgroup, subgroupIndex)
                  }
                }}
                className="hidden"
                id={`file-${uploadId}`}
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`notes-${uploadId}`} className="text-white/90">Notes</Label>
            <Textarea
              id={`notes-${uploadId}`}
              value={bill.notes}
              onChange={(e) => updateBill('notes', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {editingEntry ? 'Edit Ledger Entry' : 'Create New Ledger Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Entry Information */}
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="text-white/90">Title *</Label>
                  <Input
                    id="title"
                    value={entryForm.title}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Enter entry title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-white/90">Status</Label>
                  <Select 
                    value={entryForm.status} 
                    onValueChange={(value) => setEntryForm(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority" className="text-white/90">Priority</Label>
                  <Select 
                    value={entryForm.priority} 
                    onValueChange={(value) => setEntryForm(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due-date" className="text-white/90">Default Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={entryForm.default_due_date}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, default_due_date: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-white/90">Description</Label>
                <Textarea
                  id="description"
                  value={entryForm.description}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Enter entry description"
                  rows={3}
                />
              </div>

              {/* Responsible Parties */}
              <div>
                <Label className="text-white/90">Responsible Parties</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={responsiblePartyInput}
                    onChange={(e) => setResponsiblePartyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibleParty())}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Add responsible party"
                  />
                  <Button
                    type="button"
                    onClick={addResponsibleParty}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {entryForm.responsible_parties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entryForm.responsible_parties.map((party, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-white/10 text-white border-white/20 flex items-center gap-1"
                      >
                        {party}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeResponsibleParty(index)}
                          className="h-auto p-0 text-white/60 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-white/90">Notes</Label>
                <Textarea
                  id="notes"
                  value={entryForm.notes}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Enable Subgroup Toggle */}
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Enable Subgroups</h3>
                  <p className="text-sm text-white/60">
                    {entryForm.subgroupsEnabled 
                      ? 'Bills are organized within subgroups' 
                      : 'Bills are added directly to the main entry'
                    }
                  </p>
                </div>
                <Switch
                  checked={entryForm.subgroupsEnabled}
                  onCheckedChange={handleSubgroupToggle}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Subgroups Section */}
          {entryForm.subgroupsEnabled && (
            <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Subgroups</CardTitle>
                  <Button
                    type="button"
                    onClick={addSubgroup}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subgroup
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {entryForm.subgroups.map((subgroup, subgroupIndex) => (
                  <Card key={subgroupIndex} className="bg-white/5 backdrop-blur-sm border border-white/10">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white">
                          Subgroup {subgroupIndex + 1}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubgroup(subgroupIndex)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white/90">Title *</Label>
                          <Input
                            value={subgroup.title}
                            onChange={(e) => {
                              setEntryForm(prev => ({
                                ...prev,
                                subgroups: prev.subgroups.map((sg, idx) => 
                                  idx === subgroupIndex ? { ...sg, title: e.target.value } : sg
                                )
                              }))
                            }}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="Enter subgroup title"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-white/90">Status</Label>
                          <Select 
                            value={subgroup.status} 
                            onValueChange={(value) => {
                              setEntryForm(prev => ({
                                ...prev,
                                subgroups: prev.subgroups.map((sg, idx) => 
                                  idx === subgroupIndex ? { ...sg, status: value as any } : sg
                                )
                              }))
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-white/20">
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white/90">Priority</Label>
                          <Select 
                            value={subgroup.priority} 
                            onValueChange={(value) => {
                              setEntryForm(prev => ({
                                ...prev,
                                subgroups: prev.subgroups.map((sg, idx) => 
                                  idx === subgroupIndex ? { ...sg, priority: value as any } : sg
                                )
                              }))
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-white/20">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white/90">Allocation %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={subgroup.allocation_percentage}
                            onChange={(e) => {
                              setEntryForm(prev => ({
                                ...prev,
                                subgroups: prev.subgroups.map((sg, idx) => 
                                  idx === subgroupIndex ? { ...sg, allocation_percentage: e.target.value } : sg
                                )
                              }))
                            }}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-white/90">Description</Label>
                        <Textarea
                          value={subgroup.description}
                          onChange={(e) => {
                            setEntryForm(prev => ({
                              ...prev,
                              subgroups: prev.subgroups.map((sg, idx) => 
                                idx === subgroupIndex ? { ...sg, description: e.target.value } : sg
                              )
                            }))
                          }}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          placeholder="Enter subgroup description"
                          rows={2}
                        />
                      </div>

                      {/* Subgroup Bills */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-white">Bills</h4>
                          <Button
                            type="button"
                            onClick={() => addBill(true, subgroupIndex)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Bill
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {subgroup.bills.map((bill, billIndex) => 
                            <div key={`subgroup-${subgroupIndex}-bill-${billIndex}`}>
                              {renderBillForm(bill, billIndex, true, subgroupIndex)}
                            </div>
                          )}
                          {subgroup.bills.length === 0 && (
                            <div className="text-center py-8 text-white/60">
                              <p>No bills added yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {entryForm.subgroups.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <p>No subgroups created yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Direct Bills Section */}
          {!entryForm.subgroupsEnabled && (
            <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Bills</CardTitle>
                  <Button
                    type="button"
                    onClick={() => addBill(false)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bill
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {entryForm.directBills.map((bill, billIndex) => 
                  <div key={`direct-bill-${billIndex}`}>
                    {renderBillForm(bill, billIndex, false)}
                  </div>
                )}
                {entryForm.directBills.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <p>No bills added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !entryForm.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : editingEntry ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}