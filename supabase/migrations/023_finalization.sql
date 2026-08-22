-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 023
-- File Name     : 023_finalization.sql
-- ============================================================
-- PURPOSE
--   Final production-readiness migration for the Core Database.
--
--   This migration:
--     - Performs final schema verification
--     - Verifies required tables
--     - Verifies required functions
--     - Verifies required RLS configuration
--     - Verifies required seed roles/settings
--     - Records finalization metadata
--     - Does not modify application data
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
--   022_health_check.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FINALIZATION METADATA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.database_metadata (

    key text PRIMARY KEY,

    value jsonb NOT NULL DEFAULT '{}'::jsonb,

    updated_at timestamptz NOT NULL DEFAULT now()

);

-- ============================================================
-- 2. FINALIZATION VALIDATION
-- ============================================================

DO $$
DECLARE
    v_missing_tables text;
    v_missing_functions text;
    v_rls_disabled text;
    v_role_count integer;
    v_setting_count integer;
BEGIN

    -- ========================================================
    -- REQUIRED TABLES
    -- ========================================================

    SELECT string_agg(required_table, ', ')
    INTO v_missing_tables
    FROM (
        SELECT 'profiles' AS required_table
        WHERE to_regclass('public.profiles') IS NULL

        UNION ALL

        SELECT 'roles'
        WHERE to_regclass('public.roles') IS NULL

        UNION ALL

        SELECT 'audit_logs'
        WHERE to_regclass('public.audit_logs') IS NULL

        UNION ALL

        SELECT 'finance_transactions'
        WHERE to_regclass('public.finance_transactions') IS NULL

        UNION ALL

        SELECT 'notifications'
        WHERE to_regclass('public.notifications') IS NULL

        UNION ALL

        SELECT 'system_settings'
        WHERE to_regclass('public.system_settings') IS NULL

        UNION ALL

        SELECT 'database_metadata'
        WHERE to_regclass('public.database_metadata') IS NULL
    ) missing;

    IF v_missing_tables IS NOT NULL THEN

        RAISE EXCEPTION
            '023_finalization failed: missing required tables: %',
            v_missing_tables;

    END IF;


    -- ========================================================
    -- REQUIRED FUNCTIONS
    -- ========================================================

    SELECT string_agg(required_function, ', ')
    INTO v_missing_functions
    FROM (
        SELECT 'update_updated_at'
        WHERE to_regprocedure(
            'public.update_updated_at()'
        ) IS NULL

        UNION ALL

        SELECT 'handle_new_user'
        WHERE to_regprocedure(
            'public.handle_new_user()'
        ) IS NULL

        UNION ALL

        SELECT 'run_database_health_check'
        WHERE to_regprocedure(
            'public.run_database_health_check()'
        ) IS NULL
    ) missing;

    IF v_missing_functions IS NOT NULL THEN

        RAISE EXCEPTION
            '023_finalization failed: missing required functions: %',
            v_missing_functions;

    END IF;


    -- ========================================================
    -- RLS VERIFICATION
    -- ========================================================

    SELECT string_agg(c.relname, ', ')
    INTO v_rls_disabled
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

    IF v_rls_disabled IS NOT NULL THEN

        RAISE EXCEPTION
            '023_finalization failed: RLS disabled on: %',
            v_rls_disabled;

    END IF;


    -- ========================================================
    -- DEFAULT ROLES
    -- ========================================================

    SELECT count(*)
    INTO v_role_count
    FROM public.roles
    WHERE role_name IN (
        'SuperAdmin',
        'Admin',
        'Manager',
        'Accountant',
        'Staff',
        'Viewer'
    );

    IF v_role_count <> 6 THEN

        RAISE EXCEPTION
            '023_finalization failed: expected 6 default roles, found %',
            v_role_count;

    END IF;


    -- ========================================================
    -- DEFAULT SETTINGS
    -- ========================================================

    SELECT count(*)
    INTO v_setting_count
    FROM public.system_settings
    WHERE key IN (
        'application',
        'finance',
        'meeting'
    );

    IF v_setting_count <> 3 THEN

        RAISE EXCEPTION
            '023_finalization failed: expected 3 default settings, found %',
            v_setting_count;

    END IF;

END $$;


-- ============================================================
-- 3. FINALIZATION RECORD
-- ============================================================

INSERT INTO public.database_metadata (
    key,
    value,
    updated_at
)
VALUES (
    'core_database',
    jsonb_build_object(
        'application',
            'Temple Operations Reporting System',
        'database',
            'Core Database',
        'migration',
            '023_finalization',
        'migration_number',
            23,
        'status',
            'finalized',
        'production_ready',
            true,
        'finalized_at',
            now()
    ),
    now()
)
ON CONFLICT (key)
DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();


-- ============================================================
-- 4. MIGRATION VERSION RECORD
-- ============================================================

INSERT INTO public.database_metadata (
    key,
    value,
    updated_at
)
VALUES (
    'schema_version',
    jsonb_build_object(
        'version',
            '023',
        'migration',
            '023_finalization.sql',
        'status',
            'complete'
    ),
    now()
)
ON CONFLICT (key)
DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();


-- ============================================================
-- 5. COMMENTS
-- ============================================================

COMMENT ON TABLE public.database_metadata IS
'Core database metadata and final schema version information.';

COMMENT ON COLUMN public.database_metadata.key IS
'Unique metadata key.';

COMMENT ON COLUMN public.database_metadata.value IS
'JSONB metadata value.';

COMMENT ON COLUMN public.database_metadata.updated_at IS
'Server timestamp of the latest metadata update.';


-- ============================================================
-- 6. FINAL STATUS
-- ============================================================

DO $$
BEGIN

    RAISE NOTICE
        'Temple Operations Reporting System Core Database finalized successfully.';

    RAISE NOTICE
        'Schema version: 023';

    RAISE NOTICE
        'Production readiness: PASS';

END $$;


COMMIT;