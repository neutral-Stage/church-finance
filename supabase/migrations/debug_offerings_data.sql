-- Debug migration to check existing offerings data
-- This will help us understand the current state of the data

SELECT 'Current offerings data:' as info;
SELECT id, type, fund_allocations FROM offerings LIMIT 5;

SELECT 'Current funds data:' as info;
SELECT id, name FROM funds;