
'use client'

import { useState, useRef } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { Upload, Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'

interface AnalyzedReceipt {
    date?: string
    amount?: number
    vendor?: string
    category?: string
    description?: string
    confidence: number
}

interface ReceiptUploadProps {
    onScanComplete: (data: AnalyzedReceipt) => void
    className?: string
}

export function ReceiptUpload({ onScanComplete, className }: ReceiptUploadProps) {
    const [isScanning, setIsScanning] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size (max 4MB)
        if (file.size > 4 * 1024 * 1024) {
            toast.error('Image size must be less than 4MB')
            return
        }

        setIsScanning(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/ai/scan-receipt', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to scan receipt')
            }

            const data = await response.json()

            if (data.confidence < 0.5) {
                toast.warning('Receipt analysis low confidence. Please verify details.')
            } else {
                toast.success(`Scanned receipt from ${data.vendor || 'merchant'}`)
            }

            onScanComplete(data)
        } catch (error) {
            console.error('Scan error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to scan receipt')
        } finally {
            setIsScanning(false)
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleButtonClick = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            <GlassButton
                type="button"
                variant="outline"
                onClick={handleButtonClick}
                disabled={isScanning}
                className="w-full"
            >
                {isScanning ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                    </>
                ) : (
                    <>
                        <Camera className="mr-2 h-4 w-4" />
                        Scan Receipt
                    </>
                )}
            </GlassButton>
        </div>
    )
}
