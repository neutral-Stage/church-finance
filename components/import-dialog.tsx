'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export type ImportTarget = 'transactions' | 'members'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  importType: ImportTarget
  churchId: string
  onSuccess?: () => void
  /** Members can be imported directly or staged for review */
  memberMode?: 'staging' | 'direct'
}

const IMPORT_ENDPOINTS: Record<ImportTarget, string> = {
  transactions: '/api/import/transactions',
  members: '/api/import/members',
}

const IMPORT_LABELS: Record<ImportTarget, { title: string; description: string; accept: string }> = {
  transactions: {
    title: 'Import Bank Transactions',
    description:
      'Upload a CSV or Excel file with columns such as date, amount, and description. Rows are staged for reconciliation.',
    accept: '.csv,.xlsx,.xls',
  },
  members: {
    title: 'Import Members',
    description:
      'Upload a CSV or Excel file with at least a name column. Optional: phone, fellowship, job, location.',
    accept: '.csv,.xlsx,.xls',
  },
}

export function ImportDialog({
  open,
  onOpenChange,
  importType,
  churchId,
  onSuccess,
  memberMode = 'direct',
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const labels = IMPORT_LABELS[importType]

  const reset = () => {
    setFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a file')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('church_id', churchId)
      if (importType === 'members') {
        formData.append('mode', memberMode)
      }

      const response = await fetch(IMPORT_ENDPOINTS[importType], {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error ?? 'Import failed')
      }

      toast.success(result.message ?? `Imported ${result.imported} rows successfully`)
      onSuccess?.()
      onOpenChange(false)
      reset()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {labels.title}
          </DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">File</Label>
            <div
              className="border border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to select CSV or Excel file'}
              </p>
              <input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept={labels.accept}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Upload & Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
