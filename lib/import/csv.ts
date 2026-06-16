import * as XLSX from 'xlsx'

export interface ParsedSpreadsheet {
  headers: string[]
  rows: Record<string, string>[]
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_')
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { headers: [], rows: [] }
  }

  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  if (rawRows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = Object.keys(rawRows[0] ?? {}).map(normalizeHeader)
  const rows = rawRows.map((row) => {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = String(value ?? '').trim()
    }
    return normalized
  })

  return { headers, rows }
}

export function pickField(row: Record<string, string>, candidates: string[]): string {
  for (const key of candidates) {
    const value = row[key]
    if (value) return value
  }
  return ''
}

export function parseAmount(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseDateValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().split('T')[0] ?? null
}
