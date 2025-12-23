'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Download, FileText, Table, BarChart3, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { AdvancedExcelExporter, AdvancedPDFExporter, CSVExporter } from '@/lib/advanced-exports'
import type { ReportsData } from '@/lib/server-data'

export type ExportFormat = 'excel' | 'pdf' | 'csv'
export type ReportType = 'comprehensive' | 'financial-summary' | 'transactions' | 'offerings' | 'bills' | 'advances' | 'funds'

interface ReportExporterProps {
  data: ReportsData
  dateRange: { startDate: string; endDate: string }
}

interface ExportConfig {
  format: ExportFormat
  reportType: ReportType
  includeCharts: boolean
  includeRawData: boolean
  customFields: string[]
  fileName: string
  notes: string
}

export function ReportExporter({ data, dateRange }: ReportExporterProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'excel',
    reportType: 'comprehensive',
    includeCharts: true,
    includeRawData: true,
    customFields: [],
    fileName: `church-finance-report-${dateRange.startDate}-to-${dateRange.endDate}`,
    notes: ''
  })

  const reportTypes = [
    { value: 'comprehensive', label: 'Comprehensive Report', description: 'Complete financial overview with all data' },
    { value: 'financial-summary', label: 'Financial Summary', description: 'High-level financial metrics and trends' },
    { value: 'transactions', label: 'Transaction Report', description: 'Detailed transaction history' },
    { value: 'offerings', label: 'Offerings Report', description: 'Offering collection analysis' },
    { value: 'bills', label: 'Bills Report', description: 'Bill payment tracking and analysis' },
    { value: 'advances', label: 'Advances Report', description: 'Advance payment tracking' },
    { value: 'funds', label: 'Fund Balances', description: 'Current fund balances and allocation' }
  ]

  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', icon: Table, description: 'Full-featured spreadsheet with charts and formatting' },
    { value: 'pdf', label: 'PDF (.pdf)', icon: FileText, description: 'Professional formatted report for sharing' },
    { value: 'csv', label: 'CSV (.csv)', icon: BarChart3, description: 'Raw data for analysis in other tools' }
  ]

  const handleExport = async () => {
    try {
      setExporting(true)
      let blob: Blob
      const getFileExtension = (format: ExportFormat) => {
        switch (format) {
          case 'excel': return 'xlsx'
          case 'pdf': return 'pdf'
          case 'csv': return 'csv'
          default: return format
        }
      }

      const fileName = `${exportConfig.fileName}.${getFileExtension(exportConfig.format)}`

      switch (exportConfig.format) {
        case 'excel':
          const excelExporter = new AdvancedExcelExporter(data, dateRange)
          let excelBuffer: ArrayBuffer

          switch (exportConfig.reportType) {
            case 'comprehensive':
            default:
              excelBuffer = await excelExporter.generateComprehensiveReport()
              break
          }

          blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          })
          break

        case 'pdf':
          const pdfExporter = new AdvancedPDFExporter(data, dateRange)
          let pdfBuffer: ArrayBuffer

          switch (exportConfig.reportType) {
            case 'comprehensive':
            default:
              pdfBuffer = pdfExporter.generateComprehensiveReport()
              break
          }

          blob = new Blob([pdfBuffer], { type: 'application/pdf' })
          break

        case 'csv':
          let csvContent = ''
          switch (exportConfig.reportType) {
            case 'comprehensive':
              csvContent = CSVExporter.exportComprehensive(data)
              break
            case 'transactions':
              csvContent = CSVExporter.exportTransactions(data.transactions)
              break
            case 'offerings':
              csvContent = CSVExporter.exportOfferings(data.offerings)
              break
            case 'bills':
              csvContent = CSVExporter.exportBills(data.bills)
              break
            case 'advances':
              csvContent = CSVExporter.exportAdvances(data.advances)
              break
            case 'funds':
              csvContent = CSVExporter.exportFunds(data.funds)
              break
            default:
              csvContent = CSVExporter.exportComprehensive(data)
          }

          // Add UTF-8 BOM for proper Excel compatibility
          const csvWithBOM = '\uFEFF' + csvContent
          blob = new Blob([csvWithBOM], {
            type: 'text/csv;charset=utf-8'
          })
          break

        default:
          throw new Error('Unsupported export format')
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Report exported successfully as ${fileName}`)
      setExportDialogOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const updateConfig = (updates: Partial<ExportConfig>) => {
    setExportConfig(prev => ({ ...prev, ...updates }))
  }

  const getEstimatedSize = () => {
    const baseSize = data.transactions.length + data.offerings.length + data.bills.length + data.advances.length
    switch (exportConfig.format) {
      case 'excel':
        return `~${Math.ceil(baseSize / 100)}MB`
      case 'pdf':
        return `~${Math.ceil(baseSize / 500)}MB`
      case 'csv':
        return `~${Math.ceil(baseSize / 1000)}MB`
      default:
        return 'Unknown'
    }
  }

  return (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
          <Download className="mr-2 h-4 w-4" />
          Advanced Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Report Export
          </DialogTitle>
          <DialogDescription>
            Configure your report export with advanced options for format, content, and delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-1 gap-3">
              {exportFormats.map((format) => (
                <div
                  key={format.value}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    exportConfig.format === format.value
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateConfig({ format: format.value as ExportFormat })}
                >
                  <div className="flex items-start gap-3">
                    <format.icon className={`h-5 w-5 mt-0.5 ${
                      exportConfig.format === format.value ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium">{format.label}</div>
                      <div className="text-sm text-gray-600">{format.description}</div>
                    </div>
                    {exportConfig.format === format.value && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">Selected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Report Type</Label>
            <Select
              value={exportConfig.reportType}
              onValueChange={(value) => updateConfig({ reportType: value as ReportType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          {exportConfig.format === 'excel' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Excel Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={exportConfig.includeCharts}
                    onCheckedChange={(checked) => updateConfig({ includeCharts: !!checked })}
                  />
                  <Label htmlFor="includeCharts" className="text-sm">Include charts and visualizations</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRawData"
                    checked={exportConfig.includeRawData}
                    onCheckedChange={(checked) => updateConfig({ includeRawData: !!checked })}
                  />
                  <Label htmlFor="includeRawData" className="text-sm">Include raw data sheets</Label>
                </div>
              </div>
            </div>
          )}

          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName" className="text-sm font-medium">File Name</Label>
            <Input
              id="fileName"
              value={exportConfig.fileName}
              onChange={(e) => updateConfig({ fileName: e.target.value })}
              placeholder="Enter file name"
            />
          </div>


          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this export..."
              value={exportConfig.notes}
              onChange={(e) => updateConfig({ notes: e.target.value })}
            />
          </div>

          {/* Export Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="font-medium text-sm">Export Summary</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Format: {exportFormats.find(f => f.value === exportConfig.format)?.label}</div>
              <div>Type: {reportTypes.find(t => t.value === exportConfig.reportType)?.label}</div>
              <div>Estimated size: {getEstimatedSize()}</div>
              <div>Records: {data.transactions.length + data.offerings.length + data.bills.length + data.advances.length} total</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}