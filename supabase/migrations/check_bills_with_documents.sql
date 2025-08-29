-- Check if there are any bills with documents
SELECT 
    id,
    vendor_name,
    document_url,
    document_name,
    document_type,
    document_size,
    document_uploaded_at
FROM bills 
WHERE document_url IS NOT NULL
ORDER BY document_uploaded_at DESC
LIMIT 10;

-- Count total bills with and without documents
SELECT 
    COUNT(*) as total_bills,
    COUNT(document_url) as bills_with_documents,
    COUNT(*) - COUNT(document_url) as bills_without_documents
FROM bills;

-- Show sample bills data
SELECT 
    id,
    vendor_name,
    amount,
    document_url,
    document_name,
    ledger_entry_id,
    ledger_subgroup_id
FROM bills 
ORDER BY created_at DESC
LIMIT 5;