-- Fix missing update_fund_balance RPC function
-- This function is called by the API to update fund balances

CREATE OR REPLACE FUNCTION update_fund_balance(fund_id UUID, amount_change DECIMAL)
RETURNS VOID AS $$
BEGIN
    -- Update the fund balance by the specified amount
    UPDATE funds 
    SET current_balance = current_balance + amount_change 
    WHERE id = fund_id;
    
    -- Check if the fund exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fund with id % not found', fund_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_fund_balance(UUID, DECIMAL) TO authenticated;