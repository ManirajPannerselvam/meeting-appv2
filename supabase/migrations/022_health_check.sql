-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 022
-- File Name     : 022_health_check.sql
-- ============================================================
-- PURPOSE
--   Final database health and integrity verification.
--
-- DESIGN TARGET
--   - Safe to execute repeatedly
--   - No schema changes
--   - Detect missing core tables
--   - Detect missing required functions
--   - Verify RLS is enabled
--   - Verify required seed data exists
--   - Return a compact health report
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
--   011_reporting.sql
--   012_indexes.sql
--   013_validation.sql
--   014_views.sql
--   015_indexes.sql
--   016_views.sql
--   017_functions.sql
--   018_storage.sql
--   019_storage_policies.sql
--   020_security.sql
--   021_verification.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. HEALTH CHECK FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.run_database_health_check()
RETURNS TABLE (
    check_name text,
    status text,
    details text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count integer;
    v_missing text;
    v_rls_missing text;
BEGIN

    -- ========================================================
    -- PROFILES
    -- ========================================================

    IF to_regclass('public.profiles') IS NULL THEN
        RETURN QUERY
        SELECT
            'profiles_table',
            'FAIL',
            'public.profiles does not exist';
    ELSE
        RETURN QUERY
        SELECT
            'profiles_table',
            'PASS',
            'public.profiles exists';
    END IF;


    -- ========================================================
    -- ROLES
    -- ========================================================

    IF to_regclass('public.roles') IS NULL THEN
        RETURN QUERY
        SELECT
            'roles_table',
            'FAIL',
            'public.roles does not exist';
    ELSE
        RETURN QUERY
        SELECT
            'roles_table',
            'PASS',
            'public.roles exists';
    END IF;


    -- ========================================================
    -- AUDIT LOGS
    -- ========================================================

    IF to_regclass('public.audit_logs') IS NULL THEN
        RETURN QUERY
        SELECT
            'audit_logs_table',
            'FAIL',
            'public.audit_logs does not exist';
    ELSE
        RETURN QUERY
        SELECT
            'audit_logs_table',
            'PASS',
            'public.audit_logs exists';
    END IF;


    -- ========================================================
    -- FINANCE
    -- ========================================================

    IF to_regclass('public.finance_transactions') IS NULL THEN
        RETURN QUERY
        SELECT
            'finance_transactions_table',
            'FAIL',
            'public.finance_transactions does not exist';
    ELSE
        RETURN QUERY
        SELECT
            'finance_transactions_table',
            'PASS',
            'public.finance_transactions exists';
    END IF;


    -- ========================================================
    -- NOTIFICATIONS
    -- ========================================================

    IF to_regclass('public.notifications') IS NULL THEN
        RETURN QUERY
        SELECT
            'notifications_table',
            'FAIL',
            'public.notifications does not exist';
    ELSE
        RETURN QUERY
        SELECT
            'notifications_table',
            'PASS',
            'public.notifications exists';
    END IF;


    -- ========================================================
    -- SYSTEM SETTINGS
    -- ========================================================

    IF to_regclass('public.system_settings') IS NULL THEN
        RETURN QUERY
        SELECT
            'system_settings_table',
            'FAIL',
            'public.system_settings does not exist';
    ELSE
        RETURN QUERY
        SELECT
            'system_settings_table',
            'PASS',
            'public.system_settings exists';
    END IF;


    -- ========================================================
    -- RLS CHECK
    -- ========================================================

    SELECT string_agg(c.relname, ', ')
    INTO v_rls_missing
    FROM pg_class c
    JOIN pg_namespace n
        ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
          'profiles',
          'roles',
          'audit_logs',
          'finance_transactions',
          'notifications',
          'system_settings'
      )
      AND c.relrowsecurity = false;

    IF v_rls_missing IS NULL THEN

        RETURN QUERY
        SELECT
            'row_level_security',
            'PASS',
            'RLS is enabled on all required core tables';

    ELSE

        RETURN QUERY
        SELECT
            'row_level_security',
            'FAIL',
            'RLS disabled on: ' || v_rls_missing;

    END IF;


    -- ========================================================
    -- REQUIRED ROLES
    -- ========================================================

    IF to_regclass('public.roles') IS NOT NULL THEN

        SELECT count(*)
        INTO v_count
        FROM public.roles
        WHERE role_name IN (
            'SuperAdmin',
            'Admin',
            'Manager',
            'Accountant',
            'Staff',
            'Viewer'
        );

        IF v_count = 6 THEN

            RETURN QUERY
            SELECT
                'default_roles',
                'PASS',
                'All 6 default roles exist';

        ELSE

            RETURN QUERY
            SELECT
                'default_roles',
                'FAIL',
                format(
                    'Expected 6 default roles, found %s',
                    v_count
                );

        END IF;

    END IF;


    -- ========================================================
    -- REQUIRED SYSTEM SETTINGS
    -- ========================================================

    IF to_regclass('public.system_settings') IS NOT NULL THEN

        SELECT count(*)
        INTO v_count
        FROM public.system_settings
        WHERE key IN (
            'application',
            'finance',
            'meeting'
        );

        IF v_count = 3 THEN

            RETURN QUERY
            SELECT
                'default_settings',
                'PASS',
                'All required system settings exist';

        ELSE

            RETURN QUERY
            SELECT
                'default_settings',
                'FAIL',
                format(
                    'Expected 3 default settings, found %s',
                    v_count
                );

        END IF;

    END IF;


    -- ========================================================
    -- REQUIRED FUNCTIONS
    -- ========================================================

    SELECT string_agg(required_function, ', ')
    INTO v_missing
    FROM (
        SELECT 'update_updated_at' AS required_function
        WHERE to_regprocedure(
            'public.update_updated_at()'
        ) IS NULL

        UNION ALL

        SELECT 'handle_new_user'
        WHERE to_regprocedure(
            'public.handle_new_user()'
        ) IS NULL
    ) missing_functions;

    IF v_missing IS NULL THEN

        RETURN QUERY
        SELECT
            'required_functions',
            'PASS',
            'Required core trigger functions exist';

    ELSE

        RETURN QUERY
        SELECT
            'required_functions',
            'FAIL',
            'Missing functions: ' || v_missing;

    END IF;


    -- ========================================================
    -- DATABASE CONNECTIVITY
    -- ========================================================

    RETURN QUERY
    SELECT
        'database_connectivity',
        'PASS',
        'Database transaction executed successfully';


    -- ========================================================
    -- HEALTH CHECK COMPLETE
    -- ========================================================

    RETURN QUERY
    SELECT
        'health_check',
        'PASS',
        'Core database health check completed';

END;
$$;


-- ============================================================
-- 2. FUNCTION COMMENT
-- ============================================================

COMMENT ON FUNCTION public.run_database_health_check()
IS
'Runs a non-destructive health check for the Core Database and returns PASS/FAIL results for required tables, RLS, seed data and functions.';


-- ============================================================
-- 3. EXECUTION PRIVILEGE
-- ============================================================
-- Authenticated users may execute the health check.
-- The function only reads metadata/data and performs no changes.

GRANT EXECUTE
ON FUNCTION public.run_database_health_check()
TO authenticated;


-- ============================================================
-- 4. MIGRATION VERIFICATION
-- ============================================================

DO $$
DECLARE
    v_required_tables integer;
    v_existing_tables integer;
BEGIN

    SELECT count(*)
    INTO v_required_tables
    FROM (
        VALUES
            ('profiles'),
            ('roles'),
            ('audit_logs'),
            ('finance_transactions'),
            ('notifications'),
            ('system_settings')
    ) AS required(table_name);

    SELECT count(*)
    INTO v_existing_tables
    FROM pg_class c
    JOIN pg_namespace n
        ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname IN (
          'profiles',
          'roles',
          'audit_logs',
          'finance_transactions',
          'notifications',
          'system_settings'
      );

    IF v_existing_tables <> v_required_tables THEN

        RAISE WARNING
            '022_health_check: expected % core tables, found %',
            v_required_tables,
            v_existing_tables;

    END IF;

END $$;


-- ============================================================
-- 5. COMPLETION COMMENT
-- ============================================================

COMMENT ON SCHEMA public IS
'Temple Operations Reporting System Core Database schema. Migration 022 provides final non-destructive database health verification.';


COMMIT;