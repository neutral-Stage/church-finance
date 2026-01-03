-- Insert test bills with document data to test document preview functionality
-- This version avoids foreign key issues by using existing data

DO $$
DECLARE
    test_fund_id UUID;
    test_entry_id UUID;
    existing_user_id UUID;
BEGIN
    -- Get an existing user
    SELECT id INTO existing_user_id FROM auth.users LIMIT 1;
    
    -- Get or create a test fund
    SELECT id INTO test_fund_id FROM funds LIMIT 1;
    
    -- Get an existing ledger entry or create one if none exists
    SELECT id INTO test_entry_id FROM ledger_entries LIMIT 1;
    
    -- If no existing entry, we'll just update existing bills instead
    IF test_entry_id IS NOT NULL THEN
        -- Update some existing bills to have document data
        UPDATE bills 
        SET 
            document_url = CASE 
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 0) THEN 'bill-documents/test-invoice-1.pdf'
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 1) THEN 'bill-documents/test-receipt-1.jpg'
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 2) THEN 'bill-documents/test-spreadsheet-1.xlsx'
                ELSE document_url
            END,
            document_name = CASE 
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 0) THEN 'test-invoice-1.pdf'
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 1) THEN 'test-receipt-1.jpg'
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 2) THEN 'test-spreadsheet-1.xlsx'
                ELSE document_name
            END,
            document_size = CASE 
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 0) THEN 245760
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 1) THEN 512000
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 2) THEN 102400
                ELSE document_size
            END,
            document_type = CASE 
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 0) THEN 'application/pdf'
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 1) THEN 'image/jpeg'
                WHEN id = (SELECT id FROM bills ORDER BY id LIMIT 1 OFFSET 2) THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ELSE document_type
            END,
            document_uploaded_at = CASE 
                WHEN id IN (SELECT id FROM bills ORDER BY id LIMIT 3) THEN NOW()
                ELSE document_uploaded_at
            END
        WHERE id IN (SELECT id FROM bills ORDER BY id LIMIT 3);
        
        RAISE NOTICE 'Updated % bills with test document data', (SELECT COUNT(*) FROM bills WHERE document_url IS NOT NULL);
    ELSE
        RAISE NOTICE 'No existing ledger entries found to update bills';
    END IF;
    
END $$;