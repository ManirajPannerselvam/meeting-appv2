-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 012
-- File Name     : 012_indexes.sql
-- ============================================================
-- PURPOSE
--   Performance indexes for core application tables.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Fast dashboard/report queries
--   - Fast notification loading
--   - Fast audit history queries
--   - Minimal unnecessary indexes
--   - Safe repeated execution
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
--   003_audit_logs.sql
--   004_finance_transactions.sql
--   005_notifications.sql
--   006_system_settings.sql
--   007_rls_policies.sql
--   008_triggers.sql
--   009_seed_data.sql
--   010_rpc.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROFILES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON public.profiles (
    role
);

CREATE INDEX IF NOT EXISTS idx_profiles_department
ON public.profiles (
    department
);

CREATE INDEX IF NOT EXISTS idx_profiles_active
ON public.profiles (
    is_active
);

CREATE INDEX IF NOT EXISTS idx_profiles_department_active
ON public.profiles (
    department,
    is_active
);

-- ============================================================
-- 2. ROLES
-- ============================================================
-- role_name already has a UNIQUE constraint and therefore
-- already has a unique index.
--
-- No additional roles index is required.

-- ============================================================
-- 3. AUDIT LOGS
-- ============================================================
-- Audit history can become very large, so indexes are kept
-- focused on the expected access patterns.

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
ON public.audit_logs (
    user_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON public.audit_logs (
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created
ON public.audit_logs (
    module,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
ON public.audit_logs (
    action,
    created_at DESC
);

-- ============================================================
-- 4. FINANCE TRANSACTIONS
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

CREATE INDEX IF NOT EXISTS idx_finance_transactions_payment_date
ON public.finance_transactions (
    payment_method,
    transaction_date DESC
);

-- ============================================================
-- 5. NOTIFICATIONS
-- ============================================================
-- Main application pattern:
--   Load newest notifications for one user.
--
-- Partial index keeps the unread query small.

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications (
    user_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON public.notifications (
    user_id,
    created_at DESC
)
WHERE is_read = false;

-- ============================================================
-- 6. SYSTEM SETTINGS
-- ============================================================
-- key is already the PRIMARY KEY, therefore it already has
-- the required lookup index.
--
-- No additional index is necessary.

-- ============================================================
-- 7. COMMENTS
-- ============================================================

COMMENT ON INDEX public.idx_profiles_role IS
'Supports role-based profile filtering.';

COMMENT ON INDEX public.idx_profiles_department IS
'Supports department-based profile filtering.';

COMMENT ON INDEX public.idx_profiles_active IS
'Supports active/inactive profile filtering.';

COMMENT ON INDEX public.idx_profiles_department_active IS
'Supports department and active-status filtering.';

COMMENT ON INDEX public.idx_audit_logs_user_created IS
'Supports user audit history ordered by newest events.';

COMMENT ON INDEX public.idx_audit_logs_created IS
'Supports newest audit events and retention queries.';

COMMENT ON INDEX public.idx_audit_logs_module_created IS
'Supports module-specific audit history ordered by newest events.';

COMMENT ON INDEX public.idx_audit_logs_action_created IS
'Supports action-specific audit history ordered by newest events.';

COMMENT ON INDEX public.idx_finance_transactions_date IS
'Supports date-based financial reporting.';

COMMENT ON INDEX public.idx_finance_transactions_type_date IS
'Supports transaction-type financial reporting.';

COMMENT ON INDEX public.idx_finance_transactions_category_date IS
'Supports category-based financial reporting.';

COMMENT ON INDEX public.idx_finance_transactions_created_by_date IS
'Supports creator-based financial reporting.';

COMMENT ON INDEX public.idx_finance_transactions_payment_date IS
'Supports payment-method financial reporting.';

COMMENT ON INDEX public.idx_notifications_user_created IS
'Supports newest notifications for a user.';

COMMENT ON INDEX public.idx_notifications_unread IS
'Partial index for unread notifications per user.';

COMMIT;