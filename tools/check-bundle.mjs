#!/usr/bin/env node
/**
 * Warns when Next.js client chunks exceed budget thresholds.
 * Run after `pnpm build` (uses .next/static/chunks output).
 */
import { readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const chunksDir = join(root, '.next', 'static', 'chunks')

/** Per-chunk warn threshold (bytes) */
const CHUNK_WARN_BYTES = 500 * 1024
/** Total client JS warn threshold (bytes) */
const TOTAL_WARN_BYTES = 2.5 * 1024 * 1024

function walkJsFiles(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      walkJsFiles(fullPath, files)
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }
  return files
}

const chunkFiles = walkJsFiles(chunksDir)
if (chunkFiles.length === 0) {
  console.warn('Bundle check skipped: no .next/static/chunks found. Run pnpm build first.')
  process.exit(0)
}

let totalBytes = 0
const oversized = []

for (const file of chunkFiles) {
  const size = statSync(file).size
  totalBytes += size
  if (size >= CHUNK_WARN_BYTES) {
    oversized.push({ file: file.replace(root + '\\', '').replace(root + '/', ''), size })
  }
}

oversized.sort((a, b) => b.size - a.size)

if (oversized.length > 0) {
  console.warn('⚠ Large client chunks detected (budget: %d KB each):', CHUNK_WARN_BYTES / 1024)
  for (const item of oversized.slice(0, 10)) {
    console.warn('  - %s (%d KB)', item.file, Math.round(item.size / 1024))
  }
}

if (totalBytes >= TOTAL_WARN_BYTES) {
  console.warn(
    '⚠ Total client JS size %d KB exceeds budget of %d KB',
    Math.round(totalBytes / 1024),
    Math.round(TOTAL_WARN_BYTES / 1024)
  )
}

if (oversized.length > 0 || totalBytes >= TOTAL_WARN_BYTES) {
  console.warn('Bundle budget warnings emitted (non-fatal). Consider dynamic imports for heavy libraries.')
  process.exit(0)
}

console.log(
  'Bundle check passed: %d chunks, total %d KB',
  chunkFiles.length,
  Math.round(totalBytes / 1024)
)
