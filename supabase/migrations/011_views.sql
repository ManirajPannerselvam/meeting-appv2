-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 011
-- File Name     : 011_views.sql
-- ============================================================
-- PURPOSE
--   Read-only views for Core Database dashboards, notifications,
--   finance reporting, audit history and administration.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Read-heavy dashboard workload
--   - User-scoped views where appropriate
--   - No duplicate Template Database reporting views
--
-- SECURITY
--   - Views use existing table permissions/RLS.
--   - No SECURITY DEFINER logic.
--   - User-scoped views explicitly use auth.uid().
--   - No sensitive credentials should be stored in system_settings.
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
-- 1. CURRENT USER PROFILE VIEW
-- ============================================================
-- Returns only the authenticated user's profile.
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
-- 2. ROLE PERMISSIONS VIEW
-- ============================================================
-- Application role definitions with their permissions.
-- ============================================================

CREATE OR REPLACE VIEW public.v_role_permissions AS
SELECT
    r.id,
    r.role_name,
    r.description,
    r.permissions,
    r.created_at
FROM public.roles r;


-- ============================================================
-- 3. CURRENT USER NOTIFICATIONS VIEW
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
-- 4. CURRENT USER UNREAD NOTIFICATIONS VIEW
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
-- 5. FINANCE TRANSACTIONS VIEW
-- ============================================================
-- Exposes finance records through a reusable reporting view.
--
-- Existing RLS on finance_transactions remains responsible for
-- access control.
-- ============================================================

CREATE OR REPLACE VIEW public.v_finance_transactions AS
SELECT
    ft.transaction_id,
    ft.transaction_date,
    ft.transaction_type,
    ft.category,
    ft.description,
    ft.amount,
    ft.payment_method,
    ft.reference_no,
    ft.created_by,
    ft.created_at
FROM public.finance_transactions ft;


-- ============================================================
-- 6. FINANCE SUMMARY VIEW
-- ============================================================
-- Overall finance summary.
--
-- Access is still controlled by the underlying table's RLS.
-- The application should prefer get_finance_summary() when
-- explicit authorization and date filtering are required.
-- ============================================================

CREATE OR REPLACE VIEW public.v_finance_summary AS
SELECT
    COUNT(*)::bigint AS transaction_count,

    COALESCE(
        SUM(ft.amount),
        0
    )::numeric AS total_amount,

    COALESCE(
        SUM(ft.amount)
        FILTER (
            WHERE lower(ft.transaction_type) = 'income'
        ),
        0
    )::numeric AS income_amount,

    COALESCE(
        SUM(ft.amount)
        FILTER (
            WHERE lower(ft.transaction_type) = 'expense'
        ),
        0
    )::numeric AS expense_amount,

    MIN(ft.transaction_date) AS first_transaction_date,

    MAX(ft.transaction_date) AS last_transaction_date

FROM public.finance_transactions ft;


-- ============================================================
-- 7. CURRENT USER FINANCE VIEW
-- ============================================================
-- Shows transactions created by the authenticated user.
--
-- This does not replace the finance RLS policies.
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_finance_transactions AS
SELECT
    ft.transaction_id,
    ft.transaction_date,
    ft.transaction_type,
    ft.category,
    ft.description,
    ft.amount,
    ft.payment_method,
    ft.reference_no,
    ft.created_by,
    ft.created_at
FROM public.finance_transactions ft
WHERE ft.created_by = auth.uid();


-- ============================================================
-- 8. CURRENT USER AUDIT VIEW
-- ============================================================
-- Returns audit events belonging to the authenticated user.
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
-- 9. ADMIN AUDIT VIEW
-- ============================================================
-- Admin-only logical view.
--
-- The underlying audit_logs RLS remains the primary protection.
-- ============================================================

CREATE OR REPLACE VIEW public.v_audit_logs AS
SELECT
    a.id,
    a.user_id,
    p.email AS user_email,
    p.full_name AS user_name,
    p.role AS user_role,
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
LEFT JOIN public.profiles p
    ON p.id = a.user_id;


-- ============================================================
-- 10. SYSTEM SETTINGS VIEW
-- ============================================================
-- Returns application settings.
--
-- Do not store secrets, service-role keys, passwords or private
-- credentials in system_settings.
-- ============================================================

CREATE OR REPLACE VIEW public.v_system_settings AS
SELECT
    s.key,
    s.value,
    s.updated_at
FROM public.system_settings s;


-- ============================================================
-- 11. CURRENT USER DASHBOARD SUMMARY
-- ============================================================
-- Lightweight application dashboard summary.
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_dashboard_summary AS
SELECT
    (
        SELECT COUNT(*)::bigint
        FROM public.notifications n
        WHERE n.user_id = auth.uid()
    ) AS notification_count,

    (
        SELECT COUNT(*)::bigint
        FROM public.notifications n
        WHERE n.user_id = auth.uid()
          AND n.is_read = false
    ) AS unread_notification_count,

    (
        SELECT COUNT(*)::bigint
        FROM public.finance_transactions ft
        WHERE ft.created_by = auth.uid()
    ) AS my_finance_transaction_count,

    (
        SELECT COALESCE(SUM(ft.amount), 0)::numeric
        FROM public.finance_transactions ft
        WHERE ft.created_by = auth.uid()
    ) AS my_finance_total_amount,

    (
        SELECT COUNT(*)::bigint
        FROM public.audit_logs a
        WHERE a.user_id = auth.uid()
    ) AS my_audit_event_count;


-- ============================================================
-- 12. USER DIRECTORY VIEW
-- ============================================================
-- Administrative/user-management view.
--
-- RLS on profiles remains responsible for actual access.
-- ============================================================

CREATE OR REPLACE VIEW public.v_user_directory AS
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
FROM public.profiles p;


-- ============================================================
-- 13. ACTIVE USERS VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.v_active_users AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department,
    p.phone,
    p.avatar_url,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE p.is_active = true;


-- ============================================================
-- 14. NOTIFICATION SUMMARY VIEW
-- ============================================================
-- Aggregated notification statistics.
-- ============================================================

CREATE OR REPLACE VIEW public.v_notification_summary AS
SELECT
    n.user_id,
    COUNT(*)::bigint AS notification_count,
    COUNT(*) FILTER (
        WHERE n.is_read = false
    )::bigint AS unread_count,
    MAX(n.created_at) AS last_notification_at
FROM public.notifications n
GROUP BY n.user_id;


-- ============================================================
-- 15. FINANCE CATEGORY SUMMARY
-- ============================================================
-- Useful for dashboard charts and finance analytics.
-- ============================================================

CREATE OR REPLACE VIEW public.v_finance_category_summary AS
SELECT
    ft.category,
    COUNT(*)::bigint AS transaction_count,
    COALESCE(SUM(ft.amount), 0)::numeric AS total_amount,
    MIN(ft.transaction_date) AS first_transaction_date,
    MAX(ft.transaction_date) AS last_transaction_date
FROM public.finance_transactions ft
GROUP BY ft.category;


-- ============================================================
-- 16. FINANCE TYPE SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW public.v_finance_type_summary AS
SELECT
    ft.transaction_type,
    COUNT(*)::bigint AS transaction_count,
    COALESCE(SUM(ft.amount), 0)::numeric AS total_amount,
    MIN(ft.transaction_date) AS first_transaction_date,
    MAX(ft.transaction_date) AS last_transaction_date
FROM public.finance_transactions ft
GROUP BY ft.transaction_type;


-- ============================================================
-- 17. COMMENTS
-- ============================================================

COMMENT ON VIEW public.v_my_profile IS
'Authenticated user profile view.';

COMMENT ON VIEW public.v_role_permissions IS
'Application roles and their JSONB permissions.';

COMMENT ON VIEW public.v_my_notifications IS
'Notifications belonging to the authenticated user.';

COMMENT ON VIEW public.v_my_unread_notifications IS
'Unread notifications belonging to the authenticated user.';

COMMENT ON VIEW public.v_finance_transactions IS
'Reusable finance transaction reporting view.';

COMMENT ON VIEW public.v_finance_summary IS
'Aggregate finance transaction summary.';

COMMENT ON VIEW public.v_my_finance_transactions IS
'Finance transactions created by the authenticated user.';

COMMENT ON VIEW public.v_my_audit_logs IS
'Audit history belonging to the authenticated user.';

COMMENT ON VIEW public.v_audit_logs IS
'Application audit history joined with profile information.';

COMMENT ON VIEW public.v_system_settings IS
'Application-wide system settings.';

COMMENT ON VIEW public.v_my_dashboard_summary IS
'Lightweight dashboard summary for the authenticated user.';

COMMENT ON VIEW public.v_user_directory IS
'Application user directory view.';

COMMENT ON VIEW public.v_active_users IS
'Active application users.';

COMMENT ON VIEW public.v_notification_summary IS
'Notification counts grouped by user.';

COMMENT ON VIEW public.v_finance_category_summary IS
'Finance transaction totals grouped by category.';

COMMENT ON VIEW public.v_finance_type_summary IS
'Finance transaction totals grouped by transaction type.';


COMMIT;