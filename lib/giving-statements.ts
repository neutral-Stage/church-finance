import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberContribution } from '@/lib/server-data'

export interface GivingStatementInput {
  memberName: string
  memberId: string
  churchName: string
  year: number
  contributions: {
    service_date: string
    type: string
    amount: number
    fund_name: string
    notes?: string
  }[]
  totalAmount: number
}

export function buildGivingStatementInput(
  contrib: MemberContribution,
  churchName: string,
  year: number
): GivingStatementInput {
  const yearContributions = contrib.contributions.filter((c) =>
    c.service_date.startsWith(String(year))
  )
  const totalAmount = yearContributions.reduce((sum, c) => sum + c.amount, 0)

  return {
    memberName: contrib.member.name,
    memberId: contrib.member.id,
    churchName,
    year,
    contributions: yearContributions,
    totalAmount,
  }
}

export function generateGivingStatementPdf(input: GivingStatementInput): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Annual Giving Statement', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(input.churchName, pageWidth / 2, 28, { align: 'center' })
  doc.text(`Tax Year: ${input.year}`, pageWidth / 2, 34, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Member: ${input.memberName}`, 14, 48)
  doc.setFont('helvetica', 'normal')
  doc.text(`Member ID: ${input.memberId}`, 14, 55)
  doc.text(`Total Contributions: ${formatCurrency(input.totalAmount)}`, 14, 62)

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    'This statement summarizes your charitable contributions. No goods or services were provided in exchange for these contributions unless otherwise noted.',
    14,
    70,
    { maxWidth: pageWidth - 28 }
  )
  doc.setTextColor(0)

  const tableRows = input.contributions.map((c) => [
    formatDate(c.service_date),
    c.type,
    c.fund_name,
    formatCurrency(c.amount),
    c.notes || '',
  ])

  autoTable(doc, {
    startY: 78,
    head: [['Date', 'Type', 'Fund', 'Amount', 'Notes']],
    body: tableRows.length > 0 ? tableRows : [['No contributions recorded for this year', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50] },
    styles: { fontSize: 9 },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120
  doc.setFontSize(10)
  doc.text(`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, finalY + 12)

  return doc
}

export function downloadGivingStatementPdf(input: GivingStatementInput): void {
  const doc = generateGivingStatementPdf(input)
  const safeName = input.memberName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  doc.save(`giving-statement-${safeName}-${input.year}.pdf`)
}

export async function downloadBatchGivingStatements(
  contributions: MemberContribution[],
  churchName: string,
  year: number
): Promise<void> {
  for (const contrib of contributions) {
    const input = buildGivingStatementInput(contrib, churchName, year)
    if (input.contributions.length === 0) continue
    downloadGivingStatementPdf(input)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}
