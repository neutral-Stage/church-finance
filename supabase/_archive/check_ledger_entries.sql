-- Check existing ledger entries and their bills
SELECT 
    le.id,
    le.title,
    le.status,
    COUNT(b.id) as bill_count,
    COUNT(CASE WHEN b.document_url IS NOT NULL THEN 1 END) as bills_with_documents
FROM ledger_entries le
LEFT JOIN bills b ON b.ledger_entry_id = le.id
GROUP BY le.id, le.title, le.status
ORDER BY le.created_at DESC
LIMIT 10;

-- Show bills with documents
SELECT 
    b.id,
    b.vendor_name,
    b.amount,
    b.document_url,
    b.document_name,
    b.document_type,
    le.title as entry_title
FROM bills b
JOIN ledger_entries le ON le.id = b.ledger_entry_id
WHERE b.document_url IS NOT NULL
ORDER BY b.created_at DESC;