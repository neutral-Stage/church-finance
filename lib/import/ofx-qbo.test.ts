import { describe, expect, it } from 'vitest'
import { detectImportFormat, parseBankImportFile } from '@/lib/import/ofx-qbo'

describe('ofx-qbo import', () => {
  it('detects OFX from file extension and content', () => {
    expect(detectImportFormat('bank.ofx', '<OFX><STMTTRN></STMTTRN></OFX>')).toBe('ofx')
    expect(detectImportFormat('export.qbo', '!OFXHEADER:100')).toBe('qbo')
    expect(detectImportFormat('data.csv', 'date,amount')).toBe('csv')
  })

  it('parses OFX statement transactions', () => {
    const ofx = `<?xml version="1.0"?>
<OFX>
<STMTTRN>
<TRNAMT>-25.50</TRNAMT>
<DTPOSTED>20240615</DTPOSTED>
<MEMO>Utility bill</MEMO>
</STMTTRN>
</OFX>`
    const buffer = new TextEncoder().encode(ofx).buffer
    const { format, rows } = parseBankImportFile('statement.ofx', buffer)
    expect(format).toBe('ofx')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.amount).toBe('25.5')
    expect(rows[0]?.description).toBe('Utility bill')
    expect(rows[0]?.type).toBe('expense')
  })
})
