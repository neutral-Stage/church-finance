export interface MatchableTransaction {
  id: string
  amount: number
  description: string | null
  transaction_date: string
  type?: string
}

export interface StagingImportRow {
  parsed_amount: number | null
  parsed_date: string | null
  parsed_description: string | null
}

export interface ReconciliationMatch extends MatchableTransaction {
  score: number
  matchReasons: string[]
}

const DATE_TOLERANCE_DAYS = 3
const AMOUNT_TOLERANCE = 0.01
const MIN_FUZZY_SCORE = 0.45

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string): Set<string> {
  return new Set(value.split(' ').filter((token) => token.length > 1))
}

/**
 * Fuzzy description similarity using Jaccard index on word tokens.
 */
export function descriptionSimilarity(
  importDescription: string | null | undefined,
  ledgerDescription: string | null | undefined
): number {
  const a = normalizeText(importDescription)
  const b = normalizeText(ledgerDescription)

  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.85

  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersection = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++
  }

  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : intersection / union
}

export function scoreReconciliationMatch(
  staging: StagingImportRow,
  transaction: MatchableTransaction
): ReconciliationMatch | null {
  if (staging.parsed_amount === null) return null

  const matchReasons: string[] = []
  let score = 0

  const amountDiff = Math.abs(Number(transaction.amount) - Number(staging.parsed_amount))
  if (amountDiff > AMOUNT_TOLERANCE) return null
  score += 0.4
  matchReasons.push('amount')

  if (staging.parsed_date) {
    const dayDiff = daysBetween(transaction.transaction_date, staging.parsed_date)
    if (dayDiff > DATE_TOLERANCE_DAYS) return null
    score += dayDiff === 0 ? 0.3 : 0.2
    matchReasons.push(dayDiff === 0 ? 'exact date' : `date ±${dayDiff}d`)
  } else {
    score += 0.1
    matchReasons.push('no import date')
  }

  const fuzzy = descriptionSimilarity(staging.parsed_description, transaction.description)
  if (fuzzy < MIN_FUZZY_SCORE && staging.parsed_description && transaction.description) {
    return null
  }
  score += fuzzy * 0.3
  if (fuzzy >= MIN_FUZZY_SCORE) {
    matchReasons.push(`description ${Math.round(fuzzy * 100)}%`)
  }

  return {
    ...transaction,
    score: Math.min(1, score),
    matchReasons,
  }
}

export function findReconciliationMatches(
  staging: StagingImportRow,
  transactions: MatchableTransaction[],
  limit = 5
): ReconciliationMatch[] {
  return transactions
    .map((tx) => scoreReconciliationMatch(staging, tx))
    .filter((match): match is ReconciliationMatch => match !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
