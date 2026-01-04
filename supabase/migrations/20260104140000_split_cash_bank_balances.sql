-- Migration: Split Fund Balances into Cash and Bank

-- 1. Add new columns to 'funds' table
ALTER TABLE funds 
ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_balance DECIMAL(12,2) DEFAULT 0;

-- Initialize cash_balance with current_balance (assuming historical transactions were cash)
-- This preserves the total equality: current_balance = cash_balance + bank_balance
UPDATE funds SET cash_balance = current_balance;

-- 2. Add payment_method to 'transactions' table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank'));

-- 3. Update the trigger function to handle split balances
CREATE OR REPLACE FUNCTION update_fund_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Handle Balance Updates based on Payment Method and Type
        IF NEW.payment_method = 'cash' THEN
             IF NEW.type = 'income' THEN
                 UPDATE funds SET cash_balance = cash_balance + NEW.amount WHERE id = NEW.fund_id;
             ELSE
                 UPDATE funds SET cash_balance = cash_balance - NEW.amount WHERE id = NEW.fund_id;
             END IF;
        ELSIF NEW.payment_method = 'bank' THEN
             IF NEW.type = 'income' THEN
                 UPDATE funds SET bank_balance = bank_balance + NEW.amount WHERE id = NEW.fund_id;
             ELSE
                 UPDATE funds SET bank_balance = bank_balance - NEW.amount WHERE id = NEW.fund_id;
             END IF;
        END IF;

        -- Always update the total current_balance
        UPDATE funds SET current_balance = cash_balance + bank_balance WHERE id = NEW.fund_id;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse operations on Delete
        IF OLD.payment_method = 'cash' THEN
             IF OLD.type = 'income' THEN
                 UPDATE funds SET cash_balance = cash_balance - OLD.amount WHERE id = OLD.fund_id;
             ELSE
                 UPDATE funds SET cash_balance = cash_balance + OLD.amount WHERE id = OLD.fund_id;
             END IF;
        ELSIF OLD.payment_method = 'bank' THEN
             IF OLD.type = 'income' THEN
                 UPDATE funds SET bank_balance = bank_balance - OLD.amount WHERE id = OLD.fund_id;
             ELSE
                 UPDATE funds SET bank_balance = bank_balance + OLD.amount WHERE id = OLD.fund_id;
             END IF;
        END IF;

        -- Update total
        UPDATE funds SET current_balance = cash_balance + bank_balance WHERE id = OLD.fund_id;

        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert OLD
        IF OLD.payment_method = 'cash' THEN
             IF OLD.type = 'income' THEN
                 UPDATE funds SET cash_balance = cash_balance - OLD.amount WHERE id = OLD.fund_id;
             ELSE
                 UPDATE funds SET cash_balance = cash_balance + OLD.amount WHERE id = OLD.fund_id;
             END IF;
        ELSIF OLD.payment_method = 'bank' THEN
             IF OLD.type = 'income' THEN
                 UPDATE funds SET bank_balance = bank_balance - OLD.amount WHERE id = OLD.fund_id;
             ELSE
                 UPDATE funds SET bank_balance = bank_balance + OLD.amount WHERE id = OLD.fund_id;
             END IF;
        END IF;
        
        -- Apply NEW
        IF NEW.payment_method = 'cash' THEN
             IF NEW.type = 'income' THEN
                 UPDATE funds SET cash_balance = cash_balance + NEW.amount WHERE id = NEW.fund_id;
             ELSE
                 UPDATE funds SET cash_balance = cash_balance - NEW.amount WHERE id = NEW.fund_id;
             END IF;
        ELSIF NEW.payment_method = 'bank' THEN
             IF NEW.type = 'income' THEN
                 UPDATE funds SET bank_balance = bank_balance + NEW.amount WHERE id = NEW.fund_id;
             ELSE
                 UPDATE funds SET bank_balance = bank_balance - NEW.amount WHERE id = NEW.fund_id;
             END IF;
        END IF;

        -- Update total
        UPDATE funds SET current_balance = cash_balance + bank_balance WHERE id = NEW.fund_id;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure Update trigger is active (original scheme only had INSERT OR DELETE)
DROP TRIGGER IF EXISTS trigger_update_fund_balance ON transactions;
CREATE TRIGGER trigger_update_fund_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_fund_balance();
