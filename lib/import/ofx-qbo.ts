import { parseSpreadsheetBuffer, pickField, parseAmount, parseDateValue } from '@/lib/import/csv'

export type BankImportFormat = 'csv' | 'ofx' | 'qbo'

export function detectImportFormat(filename: string, content: string): BankImportFormat {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.ofx') || lower.endsWith('.qfx')) return 'ofx'
  if (lower.endsWith('.qbo')) return 'qbo'
  if (content.includes('<OFX>') || content.includes('<STMTTRN>')) return 'ofx'
  if (content.includes('!OFXHEADER') || content.includes('INTU.BID')) return 'qbo'
  return 'csv'
}

interface ParsedBankRow {
  date: string
  amount: number
  description: string
  type: 'income' | 'expense'
}

function parseOfxTransactions(content: string): ParsedBankRow[] {
  const rows: ParsedBankRow[] = []
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? []

  for (const block of blocks) {
    const amountRaw = block.match(/<TRNAMT>([^<]+)/i)?.[1]?.trim() ?? ''
    const dateRaw = block.match(/<DTPOSTED>(\d{8})/i)?.[1] ?? ''
    const memo =
      block.match(/<MEMO>([^<]+)/i)?.[1]?.trim() ??
      block.match(/<NAME>([^<]+)/i)?.[1]?.trim() ??
      'Imported transaction'

    const amount = parseAmount(amountRaw)
    if (amount === null) continue

    const isoDate =
      dateRaw.length === 8
        ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
        : new Date().toISOString().split('T')[0]

    rows.push({
      date: isoDate,
      amount: Math.abs(amount),
      description: memo,
      type: amount >= 0 ? 'income' : 'expense',
    })
  }

  return rows
}

/**
 * QBO files are OFX-based; reuse OFX parser for the stub implementation.
 */
function parseQboTransactions(content: string): ParsedBankRow[] {
  return parseOfxTransactions(content)
}

export function parseBankImportFile(
  filename: string,
  buffer: ArrayBuffer
): { format: BankImportFormat; rows: Record<string, string>[] } {
  const text = new TextDecoder('utf-8').decode(buffer)
  const format = detectImportFormat(filename, text)

  if (format === 'ofx' || format === 'qbo') {
    const parsed =
      format === 'qbo' ? parseQboTransactions(text) : parseOfxTransactions(text)
    return {
      format,
      rows: parsed.map((row) => ({
        date: row.date,
        amount: String(row.amount),
        description: row.description,
        type: row.type,
      })),
    }
  }

  const { rows } = parseSpreadsheetBuffer(buffer)
  return { format: 'csv', rows }
}

export const BANK_IMPORT_FIELD_MAP = {
  date: ['date', 'transaction_date', 'posted_date', 'posting_date', 'dtposted'],
  amount: ['amount', 'value', 'debit', 'credit', 'trnamt'],
  description: ['description', 'memo', 'narration', 'details', 'payee', 'name'],
  type: ['type', 'transaction_type', 'dr_cr'],
  category: ['category', 'account', 'class'],
}

export function normalizeBankRow(row: Record<string, string>) {
  const amountRaw = pickField(row, BANK_IMPORT_FIELD_MAP.amount)
  const debit = parseAmount(row.debit ?? '')
  const credit = parseAmount(row.credit ?? '')
  let amount = parseAmount(amountRaw)
  let type = pickField(row, BANK_IMPORT_FIELD_MAP.type).toLowerCase()

  if (amount === null && debit !== null) {
    amount = debit
    type = type || 'expense'
  } else if (amount === null && credit !== null) {
    amount = credit
    type = type || 'income'
  }

  if (amount !== null && amount < 0) {
    amount = Math.abs(amount)
    type = type || 'expense'
  }

  const description = pickField(row, BANK_IMPORT_FIELD_MAP.description) || 'Imported transaction'
  const parsedDate =
    parseDateValue(pickField(row, BANK_IMPORT_FIELD_MAP.date)) ??
    new Date().toISOString().split('T')[0]

  return { amount, type: type || 'expense', description, parsedDate }
}
