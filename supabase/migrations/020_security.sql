-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 020
-- File Name     : 020_security.sql
-- ============================================================
-- PURPOSE
--   Final database security hardening.
--
--   - Restrict direct function execution
--   - Keep application functions callable only where required
--   - Prevent anonymous execution of protected RPC functions
--   - Remove unnecessary public execution privileges
--   - Preserve authenticated application access
--   - Safe repeated execution
--
-- IMPORTANT
--   This migration does NOT change table RLS policies.
--   RLS remains the primary row-level protection mechanism.
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
--   011_views.sql
--   012_indexes.sql
--   013_validation.sql
--   014_views.sql
--   015_permissions.sql
--   016_storage.sql
--   017_functions.sql
--   018_reporting.sql
--   019_cleanup.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SCHEMA ACCESS
-- ============================================================
-- Authenticated application clients need access to public objects.
-- Anonymous users are not granted additional schema privileges.

REVOKE ALL
ON SCHEMA public
FROM anon;

GRANT USAGE
ON SCHEMA public
TO authenticated;

-- ============================================================
-- 2. REMOVE PUBLIC FUNCTION EXECUTION
-- ============================================================
-- PostgreSQL normally grants EXECUTE on functions to PUBLIC.
-- Remove that default exposure before granting only the required
-- application functions.

REVOKE EXECUTE
ON FUNCTION public.save_daily_report(
    date,
    text,
    uuid,
    jsonb,
    text,
    timestamptz
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.update_daily_report(
    date,
    text,
    uuid,
    jsonb,
    text,
    timestamptz
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.get_daily_reports_delta(
    timestamptz,
    integer
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.get_my_daily_reports(
    date,
    integer
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.get_my_dashboard_summary(
    date,
    date
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.get_active_templates(
    integer
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.get_my_report_statistics(
    date,
    date
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.validate_report_payload(
    jsonb
)
FROM PUBLIC;

-- ============================================================
-- 3. AUTHENTICATED RPC ACCESS
-- ============================================================
-- These functions are designed for authenticated application
-- users and continue to rely on auth.uid() and RLS.

GRANT EXECUTE
ON FUNCTION public.save_daily_report(
    date,
    text,
    uuid,
    jsonb,
    text,
    timestamptz
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.update_daily_report(
    date,
    text,
    uuid,
    jsonb,
    text,
    timestamptz
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_daily_reports_delta(
    timestamptz,
    integer
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_my_daily_reports(
    date,
    integer
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_my_dashboard_summary(
    date,
    date
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_active_templates(
    integer
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_my_report_statistics(
    date,
    date
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.validate_report_payload(
    jsonb
)
TO authenticated;

-- ============================================================
-- 4. CLEANUP FUNCTIONS
-- ============================================================
-- Cleanup functions perform their own administrator check.
-- They are therefore callable by authenticated users, but the
-- function itself rejects non-admin callers.

REVOKE EXECUTE
ON FUNCTION public.cleanup_old_audit_logs(
    integer
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.cleanup_old_notifications(
    integer
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.run_cleanup(
    integer,
    integer
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.get_cleanup_preview(
    integer,
    integer
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.cleanup_old_audit_logs(
    integer
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.cleanup_old_notifications(
    integer
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.run_cleanup(
    integer,
    integer
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_cleanup_preview(
    integer,
    integer
)
TO authenticated;

-- ============================================================
-- 5. SECURITY-DEFINER AUTH FUNCTION
-- ============================================================
-- handle_new_user() is executed by the Auth trigger.
-- It must not be exposed as a normal client RPC.

REVOKE EXECUTE
ON FUNCTION public.handle_new_user()
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.handle_new_user()
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.handle_new_user()
FROM authenticated;

-- ============================================================
-- 6. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
-- This function is called internally by database triggers and
-- does not need client RPC access.

REVOKE EXECUTE
ON FUNCTION public.update_updated_at()
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.update_updated_at()
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.update_updated_at()
FROM authenticated;

-- ============================================================
-- 7. SYSTEM SETTINGS TRIGGER FUNCTION
-- ============================================================
-- Internal trigger function only.

REVOKE EXECUTE
ON FUNCTION public.set_system_settings_updated_at()
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.set_system_settings_updated_at()
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.set_system_settings_updated_at()
FROM authenticated;

-- ============================================================
-- 8. AUDIT TRIGGER FUNCTION
-- ============================================================
-- Internal trigger function only.

REVOKE EXECUTE
ON FUNCTION public.audit_application_change()
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.audit_application_change()
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.audit_application_change()
FROM authenticated;

-- ============================================================
-- 9. PROTECT SYSTEM TABLE DIRECT WRITES
-- ============================================================
-- RLS already controls row access. These grants make the
-- intended application boundary explicit.
--
-- Authenticated clients receive no broad INSERT/UPDATE/DELETE
-- permission on global configuration or role definitions.

REVOKE INSERT, UPDATE, DELETE
ON public.roles
FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
ON public.system_settings
FROM authenticated;

-- ============================================================
-- 10. AUDIT LOG DIRECT MODIFICATION
-- ============================================================
-- Audit history should remain append-oriented.
-- Existing RLS policies already restrict normal writes.

REVOKE UPDATE, DELETE
ON public.audit_logs
FROM authenticated;

-- ============================================================
-- 11. PROFILE PROTECTION
-- ============================================================
-- Profiles are user-owned. Existing RLS controls which rows
-- can be accessed.

GRANT SELECT, UPDATE
ON public.profiles
TO authenticated;

-- ============================================================
-- 12. NOTIFICATION ACCESS
-- ============================================================
-- Existing RLS restricts rows to the owning user.

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.notifications
TO authenticated;

-- ============================================================
-- 13. FINANCE ACCESS
-- ============================================================
-- Existing RLS restricts write operations to the owner.

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.finance_transactions
TO authenticated;

-- ============================================================
-- 14. ROLES READ ACCESS
-- ============================================================

GRANT SELECT
ON public.roles
TO authenticated;

-- ============================================================
-- 15. SYSTEM SETTINGS READ ACCESS
-- ============================================================

GRANT SELECT
ON public.system_settings
TO authenticated;

-- ============================================================
-- 16. AUDIT LOG READ ACCESS
-- ============================================================
-- RLS determines which audit rows an authenticated user can see.

GRANT SELECT
ON public.audit_logs
TO authenticated;

-- ============================================================
-- 17. SEQUENCE ACCESS
-- ============================================================
-- Identity columns require sequence usage for authenticated
-- inserts where direct table inserts are permitted.

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO authenticated;

-- ============================================================
-- 18. DEFAULT PRIVILEGE HARDENING
-- ============================================================
-- Future functions created by the database owner should not
-- automatically become executable by anonymous/public clients.

ALTER DEFAULT PRIVILEGES
IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES
IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ============================================================
-- 19. COMMENTS
-- ============================================================

COMMENT ON SCHEMA public IS
'Application schema with authenticated access and RLS-based data protection.';

COMMIT;