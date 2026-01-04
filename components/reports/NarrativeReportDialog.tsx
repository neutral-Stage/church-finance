'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Download, RefreshCw, Sparkles, TrendingUp, Wallet, PiggyBank, BarChart3, Lightbulb, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import type { ReportsData } from '@/lib/server-data'

interface NarrativeReport {
    executiveSummary: string
    incomeAnalysis: string
    expenseAnalysis: string
    fundPerformance: string
    trendsAndInsights: string
    recommendations: string
    generatedAt: string
}

interface NarrativeReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: ReportsData
    dateRange: { startDate: string; endDate: string }
    churchId: string
    onExportPDF?: (narrative: NarrativeReport) => void
}

const sectionConfig = [
    { key: 'executiveSummary', title: 'Executive Summary', icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { key: 'incomeAnalysis', title: 'Income Analysis', icon: TrendingUp, color: 'from-green-500 to-green-600' },
    { key: 'expenseAnalysis', title: 'Expense Analysis', icon: Wallet, color: 'from-red-500 to-red-600' },
    { key: 'fundPerformance', title: 'Fund Performance', icon: PiggyBank, color: 'from-purple-500 to-purple-600' },
    { key: 'trendsAndInsights', title: 'Trends & Insights', icon: BarChart3, color: 'from-amber-500 to-amber-600' },
    { key: 'recommendations', title: 'Recommendations', icon: Lightbulb, color: 'from-cyan-500 to-cyan-600' },
] as const

export function NarrativeReportDialog({
    open,
    onOpenChange,
    data,
    dateRange,
    churchId,
    onExportPDF
}: NarrativeReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<NarrativeReport | null>(null)
    const [error, setError] = useState<string | null>(null)

    const generateReport = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/ai/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    dateRange,
                    churchId
                })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Failed to generate report')
            }

            const narrativeReport: NarrativeReport = await response.json()
            setReport(narrativeReport)
            toast.success('Narrative report generated successfully!')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate report'
            setError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const handleExportPDF = () => {
        if (report && onExportPDF) {
            onExportPDF(report)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        AI Narrative Financial Report
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        Generate a comprehensive AI-powered analysis of your financial data
                        <br />
                        <span className="text-white/80 font-medium">
                            Period: {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {!report ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        {loading ? (
                            <>
                                <div className="relative">
                                    <Loader2 className="h-16 w-16 text-amber-400 animate-spin" />
                                    <Sparkles className="h-6 w-6 text-amber-300 absolute top-0 right-0 animate-pulse" />
                                </div>
                                <p className="text-white/80 text-lg">Generating AI narrative report...</p>
                                <p className="text-white/50 text-sm">This may take 15-30 seconds</p>
                            </>
                        ) : error ? (
                            <>
                                <div className="text-red-400 text-center">
                                    <p className="font-medium">{error}</p>
                                </div>
                                <Button onClick={generateReport} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                            </>
                        ) : (
                            <>
                                <FileText className="h-16 w-16 text-white/40" />
                                <p className="text-white/60 text-center max-w-md">
                                    Click the button below to generate an AI-powered narrative analysis of your financial data including income trends, expense patterns, and recommendations.
                                </p>
                                <Button
                                    onClick={generateReport}
                                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate AI Report
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4">
                            {/* Generated timestamp */}
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="bg-white/10 text-white/80">
                                    Generated: {new Date(report.generatedAt).toLocaleString()}
                                </Badge>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={generateReport}
                                        disabled={loading}
                                        className="border-white/20 text-white hover:bg-white/10"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Regenerate
                                    </Button>
                                    {onExportPDF && (
                                        <Button
                                            size="sm"
                                            onClick={handleExportPDF}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export PDF
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Report sections */}
                            {sectionConfig.map(({ key, title, icon: Icon, color }) => (
                                <Card key={key} className="bg-white/5 backdrop-blur-sm border-white/10">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
                                                <Icon className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-white/90">{title}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-white/70 whitespace-pre-wrap leading-relaxed">
                                            {report[key]}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    )
}
