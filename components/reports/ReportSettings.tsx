'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Settings, FileText as FileTemplate, Clock, Mail, Save, Copy, Trash2, Edit,
  Calendar, Bell, Users, FileText, Download, Send, Plus,
  CheckCircle, XCircle, AlertCircle, RotateCcw
} from 'lucide-react'
import type { FilterConfig } from './AdvancedFilters'

interface ReportTemplate {
  id: string
  name: string
  description: string
  filters: FilterConfig
  includeCharts: boolean
  includeAnalysis: boolean
  format: 'excel' | 'pdf' | 'csv'
  createdAt: string
  isDefault: boolean
}

interface ScheduledReport {
  id: string
  templateId: string
  templateName: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  recipients: string[]
  isActive: boolean
  nextRun: string
  lastRun?: string
  createdAt: string
}

interface ReportSettingsProps {
  currentFilters: FilterConfig
  onApplyTemplate: (template: ReportTemplate) => void
}

export function ReportSettings({ currentFilters, onApplyTemplate }: ReportSettingsProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false)
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)

  // Template creation form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    includeCharts: true,
    includeAnalysis: true,
    format: 'excel' as const,
    useCurrentFilters: true
  })

  // Schedule creation form state
  const [scheduleForm, setScheduleForm] = useState({
    templateId: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    recipients: ['']
  })

  // Load saved templates and schedules
  useEffect(() => {
    loadTemplates()
    loadScheduledReports()
  }, [])

  const loadTemplates = () => {
    const saved = localStorage.getItem('reportTemplates')
    if (saved) {
      setTemplates(JSON.parse(saved))
    } else {
      // Set default templates
      const defaultTemplates: ReportTemplate[] = [
        {
          id: 'monthly-summary',
          name: 'Monthly Financial Summary',
          description: 'Comprehensive monthly overview with income, expenses, and offerings',
          filters: {
            dateRange: { startDate: '', endDate: '', preset: 'month' },
            transactionFilters: {
              types: ['income', 'expense'],
              categories: [],
              fundIds: [],
              paymentMethods: [],
              amountRange: { min: null, max: null }
            },
            offeringFilters: {
              types: [],
              amountRange: { min: null, max: null }
            },
            billFilters: {
              statuses: [],
              categories: [],
              vendorNames: [],
              fundIds: [],
              overdue: false
            },
            advanceFilters: {
              statuses: [],
              recipients: [],
              overdue: false
            },
            fundFilters: {
              fundIds: [],
              balanceRange: { min: null, max: null }
            }
          },
          includeCharts: true,
          includeAnalysis: true,
          format: 'excel',
          createdAt: new Date().toISOString(),
          isDefault: true
        },
        {
          id: 'offering-report',
          name: 'Offering Analytics',
          description: 'Detailed offering analysis with trends and member contributions',
          filters: {
            dateRange: { startDate: '', endDate: '', preset: 'quarter' },
            transactionFilters: {
              types: [],
              categories: [],
              fundIds: [],
              paymentMethods: [],
              amountRange: { min: null, max: null }
            },
            offeringFilters: {
              types: [],
              amountRange: { min: null, max: null }
            },
            billFilters: {
              statuses: [],
              categories: [],
              vendorNames: [],
              fundIds: [],
              overdue: false
            },
            advanceFilters: {
              statuses: [],
              recipients: [],
              overdue: false
            },
            fundFilters: {
              fundIds: [],
              balanceRange: { min: null, max: null }
            }
          },
          includeCharts: true,
          includeAnalysis: true,
          format: 'pdf',
          createdAt: new Date().toISOString(),
          isDefault: true
        }
      ]
      setTemplates(defaultTemplates)
      localStorage.setItem('reportTemplates', JSON.stringify(defaultTemplates))
    }
  }

  const loadScheduledReports = () => {
    const saved = localStorage.getItem('scheduledReports')
    if (saved) {
      setScheduledReports(JSON.parse(saved))
    }
  }

  const saveTemplates = (newTemplates: ReportTemplate[]) => {
    localStorage.setItem('reportTemplates', JSON.stringify(newTemplates))
    setTemplates(newTemplates)
  }

  const saveScheduledReports = (newSchedules: ScheduledReport[]) => {
    localStorage.setItem('scheduledReports', JSON.stringify(newSchedules))
    setScheduledReports(newSchedules)
  }

  const createTemplate = () => {
    const newTemplate: ReportTemplate = {
      id: `template-${Date.now()}`,
      name: templateForm.name,
      description: templateForm.description,
      filters: templateForm.useCurrentFilters ? currentFilters : {
        dateRange: { startDate: '', endDate: '', preset: 'month' },
        transactionFilters: {
          types: ['income', 'expense'],
          categories: [],
          fundIds: [],
          paymentMethods: [],
          amountRange: { min: null, max: null }
        },
        offeringFilters: {
          types: [],
          amountRange: { min: null, max: null }
        },
        billFilters: {
          statuses: [],
          categories: [],
          vendorNames: [],
          fundIds: [],
          overdue: false
        },
        advanceFilters: {
          statuses: [],
          recipients: [],
          overdue: false
        },
        fundFilters: {
          fundIds: [],
          balanceRange: { min: null, max: null }
        }
      },
      includeCharts: templateForm.includeCharts,
      includeAnalysis: templateForm.includeAnalysis,
      format: templateForm.format,
      createdAt: new Date().toISOString(),
      isDefault: false
    }

    saveTemplates([...templates, newTemplate])
    setIsCreateTemplateOpen(false)
    setTemplateForm({
      name: '',
      description: '',
      includeCharts: true,
      includeAnalysis: true,
      format: 'excel',
      useCurrentFilters: true
    })
  }

  const deleteTemplate = (templateId: string) => {
    const updated = templates.filter(t => t.id !== templateId)
    saveTemplates(updated)

    // Also remove any scheduled reports using this template
    const updatedSchedules = scheduledReports.filter(s => s.templateId !== templateId)
    saveScheduledReports(updatedSchedules)
  }

  const duplicateTemplate = (template: ReportTemplate) => {
    const newTemplate: ReportTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      isDefault: false
    }
    saveTemplates([...templates, newTemplate])
  }

  const calculateNextRun = (frequency: string, dayOfWeek?: number, dayOfMonth?: number, time?: string): string => {
    const now = new Date()
    const [hour, minute] = (time || '09:00').split(':').map(Number)

    let nextRun = new Date()
    nextRun.setHours(hour, minute, 0, 0)

    switch (frequency) {
      case 'weekly':
        const targetDay = dayOfWeek || 1
        const daysUntilTarget = (targetDay - now.getDay() + 7) % 7
        nextRun.setDate(now.getDate() + (daysUntilTarget || 7))
        break
      case 'monthly':
        const targetDate = dayOfMonth || 1
        nextRun.setDate(targetDate)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const nextQuarterStart = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1)
        nextRun = nextQuarterStart
        nextRun.setHours(hour, minute, 0, 0)
        break
      case 'yearly':
        nextRun = new Date(now.getFullYear() + 1, 0, 1)
        nextRun.setHours(hour, minute, 0, 0)
        break
    }

    return nextRun.toISOString()
  }

  const createScheduledReport = () => {
    const template = templates.find(t => t.id === scheduleForm.templateId)
    if (!template) return

    const newSchedule: ScheduledReport = {
      id: `schedule-${Date.now()}`,
      templateId: scheduleForm.templateId,
      templateName: template.name,
      frequency: scheduleForm.frequency,
      dayOfWeek: scheduleForm.dayOfWeek,
      dayOfMonth: scheduleForm.dayOfMonth,
      time: scheduleForm.time,
      recipients: scheduleForm.recipients.filter(email => email.trim()),
      isActive: true,
      nextRun: calculateNextRun(scheduleForm.frequency, scheduleForm.dayOfWeek, scheduleForm.dayOfMonth, scheduleForm.time),
      createdAt: new Date().toISOString()
    }

    saveScheduledReports([...scheduledReports, newSchedule])
    setIsCreateScheduleOpen(false)
    setScheduleForm({
      templateId: '',
      frequency: 'monthly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      time: '09:00',
      recipients: ['']
    })
  }

  const toggleScheduleActive = (scheduleId: string) => {
    const updated = scheduledReports.map(schedule =>
      schedule.id === scheduleId ? { ...schedule, isActive: !schedule.isActive } : schedule
    )
    saveScheduledReports(updated)
  }

  const deleteSchedule = (scheduleId: string) => {
    const updated = scheduledReports.filter(s => s.id !== scheduleId)
    saveScheduledReports(updated)
  }

  const addRecipientField = () => {
    setScheduleForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }))
  }

  const updateRecipient = (index: number, value: string) => {
    setScheduleForm(prev => ({
      ...prev,
      recipients: prev.recipients.map((email, i) => i === index ? value : email)
    }))
  }

  const removeRecipient = (index: number) => {
    setScheduleForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }))
  }

  const getFrequencyDescription = (schedule: ScheduledReport): string => {
    const time = schedule.time
    switch (schedule.frequency) {
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `Every ${days[schedule.dayOfWeek || 0]} at ${time}`
      case 'monthly':
        return `Monthly on the ${schedule.dayOfMonth}${getOrdinalSuffix(schedule.dayOfMonth || 1)} at ${time}`
      case 'quarterly':
        return `Quarterly at ${time}`
      case 'yearly':
        return `Yearly on January 1st at ${time}`
      default:
        return `${schedule.frequency} at ${time}`
    }
  }

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th'
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Settings</h2>
          <p className="text-muted-foreground">Manage templates, automation, and scheduled reports</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileTemplate className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduled Reports
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Report Templates</CardTitle>
                  <CardDescription>Save and reuse report configurations</CardDescription>
                </div>
                <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Report Template</DialogTitle>
                      <DialogDescription>
                        Save your current report configuration as a reusable template
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Monthly Summary Report"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-description">Description</Label>
                        <Textarea
                          id="template-description"
                          value={templateForm.description}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Comprehensive monthly financial overview..."
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="use-current-filters"
                            checked={templateForm.useCurrentFilters}
                            onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, useCurrentFilters: checked }))}
                          />
                          <Label htmlFor="use-current-filters">Use current filter settings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="include-charts"
                            checked={templateForm.includeCharts}
                            onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, includeCharts: checked }))}
                          />
                          <Label htmlFor="include-charts">Include charts and visualizations</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="include-analysis"
                            checked={templateForm.includeAnalysis}
                            onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, includeAnalysis: checked }))}
                          />
                          <Label htmlFor="include-analysis">Include advanced analysis</Label>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="template-format">Default Format</Label>
                        <Select value={templateForm.format} onValueChange={(value: any) => setTemplateForm(prev => ({ ...prev, format: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                            <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                            <SelectItem value="csv">CSV (.csv)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createTemplate} disabled={!templateForm.name.trim()}>
                        <Save className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {template.name}
                            {template.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Format:</span>
                          <Badge variant="outline" className="text-xs">
                            {template.format.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Charts:</span>
                          <span>{template.includeCharts ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Analysis:</span>
                          <span>{template.includeAnalysis ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => onApplyTemplate(template)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateTemplate(template)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!template.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Reports</CardTitle>
                  <CardDescription>Automate report generation and delivery</CardDescription>
                </div>
                <Dialog open={isCreateScheduleOpen} onOpenChange={setIsCreateScheduleOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Schedule Automated Report</DialogTitle>
                      <DialogDescription>
                        Set up automatic report generation and email delivery
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="schedule-template">Report Template</Label>
                        <Select value={scheduleForm.templateId} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, templateId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="schedule-frequency">Frequency</Label>
                          <Select value={scheduleForm.frequency} onValueChange={(value: any) => setScheduleForm(prev => ({ ...prev, frequency: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="schedule-time">Time</Label>
                          <Input
                            id="schedule-time"
                            type="time"
                            value={scheduleForm.time}
                            onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                          />
                        </div>
                      </div>

                      {scheduleForm.frequency === 'weekly' && (
                        <div>
                          <Label htmlFor="schedule-day">Day of Week</Label>
                          <Select value={scheduleForm.dayOfWeek.toString()} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {scheduleForm.frequency === 'monthly' && (
                        <div>
                          <Label htmlFor="schedule-date">Day of Month</Label>
                          <Select value={scheduleForm.dayOfMonth.toString()} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, dayOfMonth: parseInt(value) }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day}{getOrdinalSuffix(day)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label>Email Recipients</Label>
                        <div className="space-y-2">
                          {scheduleForm.recipients.map((email, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                type="email"
                                value={email}
                                onChange={(e) => updateRecipient(index, e.target.value)}
                                placeholder="email@example.com"
                                className="flex-1"
                              />
                              {scheduleForm.recipients.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeRecipient(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addRecipientField}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Recipient
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateScheduleOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={createScheduledReport}
                        disabled={!scheduleForm.templateId || !scheduleForm.recipients.some(email => email.trim())}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule Report
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {scheduledReports.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Scheduled Reports</h3>
                  <p className="text-muted-foreground mb-4">
                    Create automated reports to be generated and delivered on a regular schedule.
                  </p>
                  <Button onClick={() => setIsCreateScheduleOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Your First Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledReports.map((schedule) => (
                    <Card key={schedule.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">{schedule.templateName}</h4>
                              <Badge variant={schedule.isActive ? "default" : "secondary"}>
                                {schedule.isActive ? "Active" : "Paused"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {getFrequencyDescription(schedule)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {schedule.recipients.length} recipient{schedule.recipients.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Next run: </span>
                              <span className="font-medium">
                                {new Date(schedule.nextRun).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {schedule.lastRun && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Last run: </span>
                                <span>{new Date(schedule.lastRun).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleScheduleActive(schedule.id)}
                            >
                              {schedule.isActive ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Resume
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Preferences</CardTitle>
              <CardDescription>Customize default settings and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Default Export Format</Label>
                  <Select defaultValue="excel">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Default format for new reports and exports
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Default Report Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-charts" defaultChecked />
                      <Label htmlFor="auto-charts">Include charts automatically</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-analysis" defaultChecked />
                      <Label htmlFor="auto-analysis">Include advanced analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-summary" defaultChecked />
                      <Label htmlFor="auto-summary">Include executive summary</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Email Settings</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="email-notifications" defaultChecked />
                      <Label htmlFor="email-notifications">Send email notifications for scheduled reports</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="email-failures" defaultChecked />
                      <Label htmlFor="email-failures">Notify on report generation failures</Label>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                  Advanced scheduling features including custom frequency patterns, report delivery to cloud storage,
                  and integration with external systems will be available in future updates.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}