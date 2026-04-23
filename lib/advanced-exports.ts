import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { ReportsData } from '@/lib/server-data'
import { formatCurrency } from '@/lib/utils'

// Enhanced Excel export with formatting and charts
export class AdvancedExcelExporter {
  private workbook: ExcelJS.Workbook
  private data: ReportsData
  private dateRange: { startDate: string; endDate: string }

  constructor(data: ReportsData, dateRange: { startDate: string; endDate: string }) {
    this.workbook = new ExcelJS.Workbook()
    this.data = data
    this.dateRange = dateRange

    // Set workbook properties
    this.workbook.creator = 'Church Finance System'
    this.workbook.lastModifiedBy = 'Church Finance System'
    this.workbook.created = new Date()
    this.workbook.modified = new Date()
    this.workbook.company = 'Church Finance Management'
  }

  async generateComprehensiveReport(): Promise<ArrayBuffer> {
    await this.createSummarySheet()
    await this.createTransactionsSheet()
    await this.createOfferingsSheet()
    await this.createBillsSheet()
    await this.createAdvancesSheet()
    await this.createFundsSheet()
    await this.createChartsSheet()

    const buffer = await this.workbook.xlsx.writeBuffer()
    return buffer as ArrayBuffer
  }

  private async createSummarySheet() {
    const worksheet = this.workbook.addWorksheet('Financial Summary', {
      headerFooter: {
        firstHeader: '&C&"Arial,Bold"Church Finance Report',
        firstFooter: '&C&"Arial"Generated on &D at &T'
      }
    })

    // Header section
    worksheet.mergeCells('A1:F1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'Financial Summary Report'
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF2E7D32' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } }

    // Date range
    worksheet.mergeCells('A2:F2')
    const dateCell = worksheet.getCell('A2')
    dateCell.value = `Period: ${this.dateRange.startDate} to ${this.dateRange.endDate}`
    dateCell.font = { name: 'Arial', size: 12, italic: true }
    dateCell.alignment = { horizontal: 'center' }

    // Financial metrics
    const summary = this.calculateSummary()
    const startRow = 4

    const metrics = [
      { label: 'Total Income', value: summary.totalIncome, color: 'FF4CAF50' },
      { label: 'Total Expenses', value: summary.totalExpenses, color: 'FFF44336' },
      { label: 'Net Income', value: summary.netIncome, color: summary.netIncome >= 0 ? 'FF4CAF50' : 'FFF44336' },
      { label: 'Total Offerings', value: summary.totalOfferings, color: 'FF2196F3' },
      { label: 'Total Bills', value: summary.totalBills, color: 'FFFF9800' },
      { label: 'Outstanding Advances', value: summary.totalAdvances, color: 'FF9C27B0' }
    ]

    metrics.forEach((metric, index) => {
      const row = startRow + index
      worksheet.getCell(`A${row}`).value = metric.label
      worksheet.getCell(`A${row}`).font = { bold: true }
      worksheet.getCell(`B${row}`).value = metric.value
      worksheet.getCell(`B${row}`).numFmt = '"৳"#,##0.00'
      worksheet.getCell(`B${row}`).font = { color: { argb: metric.color }, bold: true }
    })

    // Fund balances section
    const fundStartRow = startRow + metrics.length + 2
    worksheet.getCell(`A${fundStartRow}`).value = 'Fund Balances'
    worksheet.getCell(`A${fundStartRow}`).font = { bold: true, size: 14 }

    this.data.funds.forEach((fund, index) => {
      const row = fundStartRow + index + 1
      worksheet.getCell(`A${row}`).value = fund.name
      worksheet.getCell(`B${row}`).value = fund.current_balance || 0
      worksheet.getCell(`B${row}`).numFmt = '"৳"#,##0.00'
    })

    // Apply styling and autofit columns
    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ]
  }

  private async createTransactionsSheet() {
    const worksheet = this.workbook.addWorksheet('Transactions')

    // Headers
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Fund']

    // Add data rows
    const tableData = this.data.transactions.map(transaction => [
      new Date(transaction.transaction_date),
      transaction.type,
      transaction.category || '',
      transaction.description || '',
      transaction.amount,
      transaction.payment_method || '',
      (transaction as any).fund?.name || ''
    ])

    // Only create table if there's data
    if (tableData.length > 0) {
      const tableRef = `A1:G${tableData.length + 1}`
      worksheet.addTable({
        name: 'TransactionsTable',
        ref: tableRef,
        headerRow: true,
        style: {
          theme: 'TableStyleMedium2',
          showRowStripes: true,
        },
        columns: headers.map(header => ({ name: header, filterButton: true })),
        rows: tableData
      })
    } else {
      // Add headers manually if no data
      worksheet.addRow(headers)
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
    }

    // Format columns
    worksheet.getColumn(1).numFmt = 'mm/dd/yyyy'
    worksheet.getColumn(5).numFmt = '"৳"#,##0.00'

    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  private async createOfferingsSheet() {
    const worksheet = this.workbook.addWorksheet('Offerings')

    const headers = ['Service Date', 'Type', 'Amount', 'Notes']
    worksheet.addRow(headers)

    // Style headers
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }

    // Add data
    this.data.offerings.forEach(offering => {
      worksheet.addRow([
        new Date(offering.service_date),
        offering.type,
        offering.amount,
        offering.notes || ''
      ])
    })

    // Format columns
    worksheet.getColumn(1).numFmt = 'mm/dd/yyyy'
    worksheet.getColumn(3).numFmt = '"৳"#,##0.00'

    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  private async createBillsSheet() {
    const worksheet = this.workbook.addWorksheet('Bills')

    const headers = ['Vendor', 'Amount', 'Due Date', 'Category', 'Status', 'Fund']
    worksheet.addRow(headers)

    // Style headers
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9800' } }

    // Add data with conditional formatting for overdue bills
    this.data.bills.forEach((bill, index) => {
      const row = worksheet.addRow([
        bill.vendor_name,
        bill.amount,
        new Date(bill.due_date),
        bill.category,
        bill.status || 'pending',
        (bill as any).fund?.name || ''
      ])

      // Highlight overdue bills
      if (new Date(bill.due_date) < new Date() && bill.status !== 'paid') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } }
      }
    })

    worksheet.getColumn(2).numFmt = '"৳"#,##0.00'
    worksheet.getColumn(3).numFmt = 'mm/dd/yyyy'

    worksheet.columns.forEach(column => {
      column.width = 18
    })
  }

  private async createAdvancesSheet() {
    const worksheet = this.workbook.addWorksheet('Advances')

    const headers = ['Recipient', 'Amount', 'Purpose', 'Advance Date', 'Expected Return', 'Status', 'Amount Returned']
    worksheet.addRow(headers)

    // Style headers
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C27B0' } }

    // Add data
    this.data.advances.forEach(advance => {
      worksheet.addRow([
        advance.recipient_name,
        advance.amount,
        advance.purpose,
        new Date(advance.advance_date),
        new Date(advance.expected_return_date),
        advance.status || 'outstanding',
        advance.amount_returned || 0
      ])
    })

    worksheet.getColumn(2).numFmt = '"৳"#,##0.00'
    worksheet.getColumn(4).numFmt = 'mm/dd/yyyy'
    worksheet.getColumn(5).numFmt = 'mm/dd/yyyy'
    worksheet.getColumn(7).numFmt = '"৳"#,##0.00'

    worksheet.columns.forEach(column => {
      column.width = 18
    })
  }

  private async createFundsSheet() {
    const worksheet = this.workbook.addWorksheet('Fund Balances')

    const headers = ['Fund Name', 'Current Balance', 'Description']
    worksheet.addRow(headers)

    // Style headers
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF607D8B' } }

    // Add data
    this.data.funds.forEach(fund => {
      worksheet.addRow([
        fund.name,
        fund.current_balance || 0,
        fund.description || ''
      ])
    })

    worksheet.getColumn(2).numFmt = '"৳"#,##0.00'

    worksheet.columns.forEach(column => {
      column.width = 25
    })
  }

  private async createChartsSheet() {
    const worksheet = this.workbook.addWorksheet('Charts & Analysis')

    // Create summary data for charts
    const summary = this.calculateSummary()

    // Income vs Expenses data
    worksheet.addRow(['Category', 'Amount'])
    worksheet.addRow(['Income', summary.totalIncome])
    worksheet.addRow(['Expenses', summary.totalExpenses])

    // Fund distribution data
    const fundStartRow = 5
    worksheet.getCell(`A${fundStartRow}`).value = 'Fund Distribution'
    worksheet.getCell(`A${fundStartRow}`).font = { bold: true, size: 14 }

    worksheet.addRow(['Fund Name', 'Balance'])
    this.data.funds.forEach(fund => {
      worksheet.addRow([fund.name, fund.current_balance || 0])
    })

    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  private calculateSummary() {
    const totalIncome = this.data.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = this.data.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalOfferings = this.data.offerings
      .reduce((sum, o) => sum + o.amount, 0)

    const totalBills = this.data.bills
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0)

    const totalAdvances = this.data.advances
      .reduce((sum, a) => sum + a.amount, 0)

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      totalOfferings,
      totalBills,
      totalAdvances
    }
  }
}

// Enhanced PDF export with professional formatting
export class AdvancedPDFExporter {
  private doc: jsPDF
  private data: ReportsData
  private dateRange: { startDate: string; endDate: string }
  private pageHeight: number
  private margin: number

  constructor(data: ReportsData, dateRange: { startDate: string; endDate: string }) {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.data = data
    this.dateRange = dateRange
    this.pageHeight = this.doc.internal.pageSize.height
    this.margin = 20
  }

  generateComprehensiveReport(): ArrayBuffer {
    this.addHeader()
    this.addSummarySection()
    this.addNewPage()
    this.addTransactionsSection()
    this.addNewPage()
    this.addOfferingsSection()
    this.addNewPage()
    this.addBillsSection()
    this.addNewPage()
    this.addAdvancesSection()

    return this.doc.output('arraybuffer')
  }

  private addHeader() {
    // Title
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Church Finance Report', this.doc.internal.pageSize.width / 2, 30, { align: 'center' })

    // Date range
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Period: ${this.dateRange.startDate} to ${this.dateRange.endDate}`,
                  this.doc.internal.pageSize.width / 2, 40, { align: 'center' })

    // Generation date
    this.doc.setFontSize(10)
    this.doc.text(`Generated on: ${new Date().toLocaleString()}`,
                  this.doc.internal.pageSize.width / 2, 50, { align: 'center' })
  }

  private addSummarySection() {
    let currentY = 70

    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Financial Summary', this.margin, currentY)
    currentY += 15

    const summary = this.calculateSummary()

    const summaryData = [
      ['Metric', 'Amount'],
      ['Total Income', formatCurrency(summary.totalIncome)],
      ['Total Expenses', formatCurrency(summary.totalExpenses)],
      ['Net Income', formatCurrency(summary.netIncome)],
      ['Total Offerings', formatCurrency(summary.totalOfferings)],
      ['Total Bills', formatCurrency(summary.totalBills)],
      ['Outstanding Advances', formatCurrency(summary.totalAdvances)]
    ];

    (this.doc as any).autoTable({
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243] },
      styles: { fontSize: 10 },
      columnStyles: {
        1: { halign: 'right' }
      }
    })

    currentY = (this.doc as any).lastAutoTable.finalY + 20

    // Fund balances
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Fund Balances', this.margin, currentY)
    currentY += 10

    const fundData = [['Fund Name', 'Balance']]
    this.data.funds.forEach(fund => {
      fundData.push([fund.name, formatCurrency(fund.current_balance || 0)])
    });

    (this.doc as any).autoTable({
      head: [fundData[0]],
      body: fundData.slice(1),
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80] },
      styles: { fontSize: 10 },
      columnStyles: {
        1: { halign: 'right' }
      }
    })
  }

  private addTransactionsSection() {
    this.addSectionHeader('Transactions Summary')

    const transactionData = [['Date', 'Type', 'Category', 'Amount']]

    this.data.transactions.slice(0, 20).forEach(transaction => {
      transactionData.push([
        new Date(transaction.transaction_date).toLocaleDateString(),
        transaction.type,
        transaction.category || 'N/A',
        formatCurrency(transaction.amount)
      ])
    });

    (this.doc as any).autoTable({
      head: [transactionData[0]],
      body: transactionData.slice(1),
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [25, 118, 210] },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: 'right' }
      }
    })
  }

  private addOfferingsSection() {
    this.addSectionHeader('Offerings Summary')

    const offeringData = [['Service Date', 'Type', 'Amount', 'Notes']]

    this.data.offerings.slice(0, 20).forEach(offering => {
      offeringData.push([
        new Date(offering.service_date).toLocaleDateString(),
        offering.type,
        formatCurrency(offering.amount),
        (offering.notes || '').substring(0, 30) + (offering.notes && offering.notes.length > 30 ? '...' : '')
      ])
    });

    (this.doc as any).autoTable({
      head: [offeringData[0]],
      body: offeringData.slice(1),
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80] },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { halign: 'right' }
      }
    })
  }

  private addBillsSection() {
    this.addSectionHeader('Bills Summary')

    const billData = [['Vendor', 'Amount', 'Due Date', 'Status']]

    this.data.bills.slice(0, 20).forEach(bill => {
      billData.push([
        bill.vendor_name,
        formatCurrency(bill.amount),
        new Date(bill.due_date).toLocaleDateString(),
        bill.status || 'pending'
      ])
    });

    (this.doc as any).autoTable({
      head: [billData[0]],
      body: billData.slice(1),
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [255, 152, 0] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' }
      }
    })
  }

  private addAdvancesSection() {
    this.addSectionHeader('Advances Summary')

    const advanceData = [['Recipient', 'Amount', 'Status', 'Expected Return']]

    this.data.advances.slice(0, 20).forEach(advance => {
      advanceData.push([
        advance.recipient_name,
        formatCurrency(advance.amount),
        advance.status || 'outstanding',
        new Date(advance.expected_return_date).toLocaleDateString()
      ])
    });

    (this.doc as any).autoTable({
      head: [advanceData[0]],
      body: advanceData.slice(1),
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [156, 39, 176] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' }
      }
    })
  }

  private addSectionHeader(title: string) {
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin, 60)
  }

  private addNewPage() {
    this.doc.addPage()
    this.addPageHeader()
  }

  private addPageHeader() {
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Church Finance Report', this.margin, 20)

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    const pageCount = this.doc.internal.pages ? this.doc.internal.pages.length - 1 : 1
    this.doc.text(`Page ${pageCount}`,
                  this.doc.internal.pageSize.width - this.margin, 20, { align: 'right' })
  }


  private calculateSummary() {
    const totalIncome = this.data.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = this.data.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalOfferings = this.data.offerings
      .reduce((sum, o) => sum + o.amount, 0)

    const totalBills = this.data.bills
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0)

    const totalAdvances = this.data.advances
      .reduce((sum, a) => sum + a.amount, 0)

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      totalOfferings,
      totalBills,
      totalAdvances
    }
  }
}

// CSV Export utility
export class CSVExporter {
  static exportTransactions(transactions: any[]): string {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Fund']
    const rows = transactions.map(t => [
      t.transaction_date,
      t.type,
      t.category || '',
      t.description || '',
      formatCurrency(t.amount),
      t.payment_method || '',
      t.fund?.name || ''
    ])

    return this.arrayToCSV([headers, ...rows])
  }

  static exportOfferings(offerings: any[]): string {
    const headers = ['Service Date', 'Type', 'Amount', 'Notes']
    const rows = offerings.map(o => [
      o.service_date,
      o.type,
      formatCurrency(o.amount),
      o.notes || ''
    ])

    return this.arrayToCSV([headers, ...rows])
  }

  static exportBills(bills: any[]): string {
    const headers = ['Vendor', 'Amount', 'Due Date', 'Category', 'Status', 'Fund']
    const rows = bills.map(b => [
      b.vendor_name,
      formatCurrency(b.amount),
      b.due_date,
      b.category,
      b.status || 'pending',
      b.fund?.name || ''
    ])

    return this.arrayToCSV([headers, ...rows])
  }

  static exportAdvances(advances: any[]): string {
    const headers = ['Recipient', 'Amount', 'Purpose', 'Advance Date', 'Expected Return', 'Status', 'Amount Returned']
    const rows = advances.map(a => [
      a.recipient_name,
      formatCurrency(a.amount),
      a.purpose,
      a.advance_date,
      a.expected_return_date,
      a.status || 'outstanding',
      formatCurrency(a.amount_returned || 0)
    ])

    return this.arrayToCSV([headers, ...rows])
  }

  static exportFunds(funds: any[]): string {
    const headers = ['Fund Name', 'Current Balance', 'Description']
    const rows = funds.map(f => [
      f.name,
      formatCurrency(f.current_balance || 0),
      f.description || ''
    ])

    return this.arrayToCSV([headers, ...rows])
  }

  static exportComprehensive(data: any): string {
    let csv = '=== COMPREHENSIVE FINANCIAL REPORT ===\n\n'

    // Summary section
    csv += '=== FINANCIAL SUMMARY ===\n'
    const totalIncome = data.transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0)
    const totalExpenses = data.transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0)
    const totalOfferings = data.offerings.reduce((sum: number, o: any) => sum + o.amount, 0)

    csv += `Total Income,${formatCurrency(totalIncome)}\n`
    csv += `Total Expenses,${formatCurrency(totalExpenses)}\n`
    csv += `Net Income,${formatCurrency(totalIncome - totalExpenses)}\n`
    csv += `Total Offerings,${formatCurrency(totalOfferings)}\n\n`

    // Transactions
    csv += '=== TRANSACTIONS ===\n'
    csv += this.exportTransactions(data.transactions) + '\n\n'

    // Offerings
    csv += '=== OFFERINGS ===\n'
    csv += this.exportOfferings(data.offerings) + '\n\n'

    // Bills
    csv += '=== BILLS ===\n'
    csv += this.exportBills(data.bills) + '\n\n'

    // Advances
    csv += '=== ADVANCES ===\n'
    csv += this.exportAdvances(data.advances) + '\n\n'

    // Funds
    csv += '=== FUND BALANCES ===\n'
    csv += this.exportFunds(data.funds)

    return csv
  }

  private static arrayToCSV(data: any[][]): string {
    return data.map(row =>
      row.map(field => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      }).join(',')
    ).join('\n')
  }
}