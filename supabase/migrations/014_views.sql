-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 014
-- File Name     : 014_views.sql
-- ============================================================
-- PURPOSE
--   Read-only views for dashboard, reporting and administration.
--
-- DESIGN TARGET
--   - Reusable reporting queries
--   - Keep application SQL simple
--   - Preserve RLS protection from underlying tables
--   - No duplicated application data
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
--   012_indexes.sql
--   013_validation.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ACTIVE ROLES
-- ============================================================

CREATE OR REPLACE VIEW public.v_active_roles AS
SELECT
    r.id,
    r.role_name,
    r.description,
    r.permissions,
    r.created_at
FROM public.roles r
WHERE r.role_name IS NOT NULL
ORDER BY r.role_name;

-- ============================================================
-- 2. ACTIVE PROFILES
-- ============================================================

CREATE OR REPLACE VIEW public.v_active_profiles AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE p.is_active = true;

-- ============================================================
-- 3. CURRENT USER PROFILE
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_profile AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE p.id = auth.uid();

-- ============================================================
-- 4. CURRENT USER NOTIFICATIONS
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_notifications AS
SELECT
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM public.notifications n
WHERE n.user_id = auth.uid();

-- ============================================================
-- 5. CURRENT USER UNREAD NOTIFICATIONS
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_unread_notifications AS
SELECT
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM public.notifications n
WHERE n.user_id = auth.uid()
  AND n.is_read = false;

-- ============================================================
-- 6. CURRENT USER FINANCE TRANSACTIONS
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_finance_transactions AS
SELECT
    f.transaction_id,
    f.transaction_date,
    f.transaction_type,
    f.category,
    f.description,
    f.amount,
    f.payment_method,
    f.reference_no,
    f.created_by,
    f.created_at
FROM public.finance_transactions f
WHERE f.created_by = auth.uid();

-- ============================================================
-- 7. FINANCE SUMMARY
-- ============================================================
-- Current user's finance totals.
--
-- Income/expense classification is based on transaction_type.
-- Unknown transaction types are included in total_amount only.

CREATE OR REPLACE VIEW public.v_my_finance_summary AS
SELECT
    COUNT(*)::bigint AS transaction_count,

    COALESCE(
        SUM(amount),
        0
    ) AS total_amount,

    COALESCE(
        SUM(amount)
        FILTER (
            WHERE lower(transaction_type) IN (
                'income',
                'credit',
                'receipt'
            )
        ),
        0
    ) AS total_income,

    COALESCE(
        SUM(amount)
        FILTER (
            WHERE lower(transaction_type) IN (
                'expense',
                'debit',
                'payment'
            )
        ),
        0
    ) AS total_expense,

    MAX(transaction_date) AS last_transaction_date

FROM public.finance_transactions
WHERE created_by = auth.uid();

-- ============================================================
-- 8. FINANCE CATEGORY SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_finance_category_summary AS
SELECT
    f.category,
    COUNT(*)::bigint AS transaction_count,
    COALESCE(SUM(f.amount), 0) AS total_amount,
    MAX(f.transaction_date) AS last_transaction_date
FROM public.finance_transactions f
WHERE f.created_by = auth.uid()
GROUP BY f.category;

-- ============================================================
-- 9. FINANCE MONTHLY SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_finance_monthly_summary AS
SELECT
    date_trunc(
        'month',
        f.transaction_date::timestamp
    )::date AS month,

    COUNT(*)::bigint AS transaction_count,

    COALESCE(
        SUM(f.amount)
        FILTER (
            WHERE lower(f.transaction_type) IN (
                'income',
                'credit',
                'receipt'
            )
        ),
        0
    ) AS total_income,

    COALESCE(
        SUM(f.amount)
        FILTER (
            WHERE lower(f.transaction_type) IN (
                'expense',
                'debit',
                'payment'
            )
        ),
        0
    ) AS total_expense,

    COALESCE(
        SUM(f.amount),
        0
    ) AS net_amount

FROM public.finance_transactions f
WHERE f.created_by = auth.uid()
GROUP BY
    date_trunc(
        'month',
        f.transaction_date::timestamp
    )::date;

-- ============================================================
-- 10. CURRENT USER AUDIT HISTORY
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_audit_logs AS
SELECT
    a.id,
    a.user_id,
    a.action,
    a.module,
    a.record_id,
    a.description,
    a.old_data,
    a.new_data,
    a.ip_address,
    a.user_agent,
    a.created_at
FROM public.audit_logs a
WHERE a.user_id = auth.uid();

-- ============================================================
-- 11. ADMIN USER SUMMARY
-- ============================================================
-- Provides lightweight user counts by role and department.
--
-- Underlying profiles RLS still determines which rows are
-- available to the querying role.

CREATE OR REPLACE VIEW public.v_profile_summary AS
SELECT
    COUNT(*)::bigint AS total_profiles,

    COUNT(*)
    FILTER (
        WHERE is_active = true
    )::bigint AS active_profiles,

    COUNT(*)
    FILTER (
        WHERE is_active = false
    )::bigint AS inactive_profiles

FROM public.profiles;

-- ============================================================
-- 12. ROLE USER SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW public.v_profile_role_summary AS
SELECT
    p.role,
    COUNT(*)::bigint AS user_count,
    COUNT(*)
    FILTER (
        WHERE p.is_active = true
    )::bigint AS active_user_count
FROM public.profiles p
GROUP BY p.role;

-- ============================================================
-- 13. DEPARTMENT USER SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW public.v_profile_department_summary AS
SELECT
    p.department,
    COUNT(*)::bigint AS user_count,
    COUNT(*)
    FILTER (
        WHERE p.is_active = true
    )::bigint AS active_user_count
FROM public.profiles p
GROUP BY p.department;

-- ============================================================
-- 14. APPLICATION SETTINGS
-- ============================================================

CREATE OR REPLACE VIEW public.v_system_settings AS
SELECT
    s.key,
    s.value,
    s.updated_at
FROM public.system_settings s;

-- ============================================================
-- 15. COMMENTS
-- ============================================================

COMMENT ON VIEW public.v_active_roles IS
'Active application role definitions.';

COMMENT ON VIEW public.v_active_profiles IS
'Active application user profiles.';

COMMENT ON VIEW public.v_my_profile IS
'Profile of the currently authenticated user.';

COMMENT ON VIEW public.v_my_notifications IS
'Notifications belonging to the currently authenticated user.';

COMMENT ON VIEW public.v_my_unread_notifications IS
'Unread notifications belonging to the currently authenticated user.';

COMMENT ON VIEW public.v_my_finance_transactions IS
'Finance transactions created by the currently authenticated user.';

COMMENT ON VIEW public.v_my_finance_summary IS
'Financial summary for the currently authenticated user.';

COMMENT ON VIEW public.v_my_finance_category_summary IS
'Finance totals grouped by category for the current user.';

COMMENT ON VIEW public.v_my_finance_monthly_summary IS
'Monthly finance summary for the current user.';

COMMENT ON VIEW public.v_my_audit_logs IS
'Audit history belonging to the currently authenticated user.';

COMMENT ON VIEW public.v_profile_summary IS
'Overall profile counts.';

COMMENT ON VIEW public.v_profile_role_summary IS
'Profile counts grouped by application role.';

COMMENT ON VIEW public.v_profile_department_summary IS
'Profile counts grouped by department.';

COMMENT ON VIEW public.v_system_settings IS
'Application-wide system settings.';

COMMIT;