'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, FileUp, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useChurch } from '@/contexts/ChurchContext'
import { useRouter } from 'next/navigation'

interface ParsedItem {
    date: string
    description: string
    amount: number
}

export function ReconciliationUpload() {
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<ParsedItem[]>([])
    const [uploading, setUploading] = useState(false)
    const [parsing, setParsing] = useState(false)
    const { selectedChurch } = useChurch()
    const supabase = createClientComponentClient()
    const router = useRouter()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            parseCSV(e.target.files[0])
        }
    }

    const parseCSV = (file: File) => {
        setParsing(true)
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    // Simple mapping logic - expects specific headers or tries to guess
                    // Supported headers: Date, Description, Amount, Debit, Credit
                    const items: ParsedItem[] = results.data.map((row: any) => {
                        const date = row['Date'] || row['date'] || new Date().toISOString()
                        const description = row['Description'] || row['description'] || row['Memo'] || 'No description'

                        let amount = 0
                        if (row['Amount']) {
                            amount = parseFloat(row['Amount'].replace(/[^0-9.-]+/g, ''))
                        } else if (row['Credit'] && row['Debit']) {
                            const credit = parseFloat(row['Credit'].replace(/[^0-9.-]+/g, '') || '0')
                            const debit = parseFloat(row['Debit'].replace(/[^0-9.-]+/g, '') || '0')
                            amount = credit - debit
                        }

                        return {
                            date: new Date(date).toISOString().split('T')[0], // YYYY-MM-DD
                            description,
                            amount
                        }
                    }).filter(item => !isNaN(item.amount) && item.amount !== 0)

                    setPreviewData(items)
                    toast.success(`Parsed ${items.length} transactions from CSV`)
                } catch (error) {
                    console.error('Parse error:', error)
                    toast.error('Failed to parse CSV. Please ensure headers are correct.')
                } finally {
                    setParsing(false)
                }
            },
            error: (error) => {
                console.error('CSV Error:', error)
                toast.error('Error reading CSV file')
                setParsing(false)
            }
        })
    }

    const handleUpload = async () => {
        if (!selectedChurch || previewData.length === 0) return

        try {
            setUploading(true)

            // 1. Create Session
            const { data: session, error: sessionError } = await supabase
                .from('reconciliation_sessions')
                .insert({
                    church_id: selectedChurch.id,
                    statement_start_date: previewData[previewData.length - 1].date, // Assumes sorted? Logic can be improved
                    statement_end_date: previewData[0].date,
                    status: 'in_progress'
                })
                .select()
                .single()

            if (sessionError) throw sessionError

            // 2. Insert Items
            const itemsToInsert = previewData.map(item => ({
                session_id: session.id,
                transaction_date: item.date,
                amount: Math.abs(item.amount), // Storing absolute for matching? Or keep sign?
                description: item.description,
                match_status: 'unmatched'
            }))

            const { error: itemsError } = await supabase
                .from('bank_statement_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            toast.success('Statement uploaded successfully!')
            // Redirect to matcher page
            router.push(`/reconciliation/${session.id}`)

        } catch (error: any) {
            console.error('Upload failed:', error)
            toast.error(error.message || 'Failed to create reconciliation session')
        } finally {
            setUploading(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Upload Bank Statement</CardTitle>
                <CardDescription>Upload a CSV file from your bank to start reconciliation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input
                        id="statement"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </div>

                {parsing && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing CSV files...
                    </div>
                )}

                {previewData.length > 0 && (
                    <div className="space-y-4">
                        <Alert>
                            <FileUp className="h-4 w-4" />
                            <AlertTitle>Ready to Upload</AlertTitle>
                            <AlertDescription>
                                Found {previewData.length} transactions.
                                Date Range: {previewData[previewData.length - 1].date} to {previewData[0].date}
                            </AlertDescription>
                        </Alert>

                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                            {previewData.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm p-2 border-b last:border-0">
                                    <span>{item.date}</span>
                                    <span className="truncate max-w-[200px]">{item.description}</span>
                                    <span className={item.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {item.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {previewData.length > 5 && (
                                <div className="text-center text-xs text-muted-foreground pt-2">
                                    ...and {previewData.length - 5} more
                                </div>
                            )}
                        </div>

                        <Button onClick={handleUpload} disabled={uploading || !selectedChurch} className="w-full">
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Session...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Start Reconciliation
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
