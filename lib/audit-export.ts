import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface AuditExportEntry {
  id: string
  church_id: string | null
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function auditEntriesToCsv(entries: AuditExportEntry[]): string {
  const headers = [
    'When',
    'User ID',
    'Action',
    'Entity Type',
    'Entity ID',
    'Old Data',
    'New Data',
  ]
  const lines = [
    headers.join(','),
    ...entries.map((entry) =>
      [
        entry.created_at,
        entry.user_id ?? '',
        entry.action,
        entry.entity_type,
        entry.entity_id,
        JSON.stringify(entry.old_data ?? {}),
        JSON.stringify(entry.new_data ?? entry.old_data ?? {}),
      ]
        .map((v) => escapeCsv(String(v)))
        .join(',')
    ),
  ]
  return lines.join('\n')
}

export function downloadAuditCsv(entries: AuditExportEntry[], filename = 'audit-log.csv'): void {
  const csv = auditEntriesToCsv(entries)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadAuditPdf(entries: AuditExportEntry[], filename = 'audit-log.pdf'): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text('Audit Log Export', 14, 16)
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [['When', 'User', 'Action', 'Entity', 'Entity ID', 'Details']],
    body: entries.map((entry) => [
      entry.created_at,
      entry.user_id ?? '—',
      entry.action,
      entry.entity_type,
      entry.entity_id,
      entry.action === 'delete'
        ? JSON.stringify(entry.old_data ?? {})
        : JSON.stringify(entry.new_data ?? entry.old_data ?? {}),
    ]),
    styles: { fontSize: 7, cellWidth: 'wrap' },
    headStyles: { fillColor: [30, 64, 120] },
  })

  doc.save(filename)
}
