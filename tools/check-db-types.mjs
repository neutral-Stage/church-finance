#!/usr/bin/env node
/**
 * Verifies types/database.ts includes tables referenced by migrations.
 * Run after `pnpm db:types` when Supabase CLI is available locally.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const typesPath = join(root, 'types', 'database.ts')
const required = [
  'budgets',
  'audit_log',
  'import_staging',
  'organizations',
  'plans',
  'church_invitations',
  'accounting_periods',
  'member_portal_tokens',
]

const content = readFileSync(typesPath, 'utf8')
const missing = required.filter((table) => !content.includes(`${table}: {`))

if (missing.length > 0) {
  console.error('types/database.ts is missing tables:', missing.join(', '))
  console.error('Run: pnpm db:types (requires Supabase CLI + linked project)')
  process.exit(1)
}

console.log('Database types check passed.')
