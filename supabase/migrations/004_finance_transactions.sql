-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 004
-- File Name     : 004_finance_transactions.sql
-- ============================================================
-- PURPOSE
--   Store financial transactions for reporting and tracking.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Reliable financial data
--   - Minimal index/storage overhead
--   - Safe long-term operation
--
-- DEPENDS ON
--   001_profiles.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FINANCE TRANSACTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.finance_transactions (

    transaction_id uuid PRIMARY KEY
        DEFAULT gen_random_uuid(),

    transaction_date date NOT NULL,

    transaction_type text NOT NULL,

    category text NOT NULL,

    description text,

    amount numeric(14,2) NOT NULL,

    payment_method text,

    reference_no text,

    created_by uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at timestamptz NOT NULL
        DEFAULT now(),

    updated_at timestamptz NOT NULL
        DEFAULT now()

);

-- ============================================================
-- 2. VALIDATION
-- ============================================================

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_type_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_type_not_empty_check
CHECK (
    length(trim(transaction_type)) > 0
);

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_category_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_category_not_empty_check
CHECK (
    length(trim(category)) > 0
);

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_payment_method_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_payment_method_not_empty_check
CHECK (
    payment_method IS NULL
    OR length(trim(payment_method)) > 0
);

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_reference_no_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_reference_no_not_empty_check
CHECK (
    reference_no IS NULL
    OR length(trim(reference_no)) > 0
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
--
-- Keep indexes focused on real reporting patterns.
--
-- Primary key already provides the transaction_id index.
--
-- Do NOT index:
--   description
--   payment_method
--   reference_no
--
-- unless production query analysis proves that they are needed.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_finance_transactions_date
ON public.finance_transactions (
    transaction_date DESC
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_type_date
ON public.finance_transactions (
    transaction_type,
    transaction_date DESC
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_category_date
ON public.finance_transactions (
    category,
    transaction_date DESC
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_created_by_date
ON public.finance_transactions (
    created_by,
    transaction_date DESC
);

-- ============================================================
-- 4. COMMENTS
-- ============================================================

COMMENT ON TABLE public.finance_transactions IS
'Financial transaction records used for operational financial reporting.';

COMMENT ON COLUMN public.finance_transactions.transaction_id IS
'Unique transaction identifier.';

COMMENT ON COLUMN public.finance_transactions.transaction_date IS
'Business date of the financial transaction.';

COMMENT ON COLUMN public.finance_transactions.transaction_type IS
'Transaction classification such as income, expense, transfer or adjustment.';

COMMENT ON COLUMN public.finance_transactions.category IS
'Financial transaction category.';

COMMENT ON COLUMN public.finance_transactions.description IS
'Optional human-readable transaction description.';

COMMENT ON COLUMN public.finance_transactions.amount IS
'Transaction amount with two decimal places. Zero-value transactions are permitted unless restricted by application rules.';

COMMENT ON COLUMN public.finance_transactions.payment_method IS
'Optional payment method such as cash, bank transfer, UPI or card.';

COMMENT ON COLUMN public.finance_transactions.reference_no IS
'Optional external or business reference number.';

COMMENT ON COLUMN public.finance_transactions.created_by IS
'Application profile that created the transaction.';

COMMENT ON COLUMN public.finance_transactions.created_at IS
'Timestamp when the transaction was created.';

COMMENT ON COLUMN public.finance_transactions.updated_at IS
'Timestamp when the transaction was last modified.';

COMMIT;