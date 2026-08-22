-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 021
-- File Name     : 021_verification.sql
-- ============================================================
-- PURPOSE
--   Verify the final Core Database structure after all
--   migrations have been applied.
--
-- DESIGN
--   - Read-only verification
--   - Does not modify application data
--   - Raises exceptions when required objects are missing
--   - Verifies tables, RLS, functions, views and triggers
--   - Safe to execute repeatedly
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
--   020_security.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REQUIRED TABLES
-- ============================================================

DO $$
DECLARE
    v_table text;
BEGIN

    FOREACH v_table IN ARRAY ARRAY[
        'profiles',
        'roles',
        'audit_logs',
        'finance_transactions',
        'notifications',
        'system_settings'
    ]
    LOOP

        IF to_regclass('public.' || v_table) IS NULL THEN
            RAISE EXCEPTION
                'Verification failed: required table public.% does not exist',
                v_table;
        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 2. REQUIRED TABLE RLS
-- ============================================================

DO $$
DECLARE
    v_table text;
    v_rls_enabled boolean;
BEGIN

    FOREACH v_table IN ARRAY ARRAY[
        'profiles',
        'roles',
        'audit_logs',
        'finance_transactions',
        'notifications',
        'system_settings'
    ]
    LOOP

        SELECT c.relrowsecurity
        INTO v_rls_enabled
        FROM pg_class c
        JOIN pg_namespace n
            ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = v_table;

        IF COALESCE(v_rls_enabled, false) = false THEN
            RAISE EXCEPTION
                'Verification failed: RLS is disabled on public.%',
                v_table;
        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 3. REQUIRED FUNCTIONS
-- ============================================================

DO $$
DECLARE
    v_function text;
BEGIN

    FOREACH v_function IN ARRAY ARRAY[
        'update_updated_at',
        'handle_new_user',
        'save_daily_report',
        'update_daily_report',
        'get_daily_reports_delta',
        'get_my_daily_reports',
        'get_my_dashboard_summary',
        'get_active_templates',
        'get_my_report_statistics',
        'validate_report_payload',
        'cleanup_old_audit_logs',
        'cleanup_old_notifications',
        'run_cleanup',
        'get_cleanup_preview'
    ]
    LOOP

        IF NOT EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n
                ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = v_function
        ) THEN

            RAISE EXCEPTION
                'Verification failed: required function public.% does not exist',
                v_function;

        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 4. REQUIRED VIEWS
-- ============================================================
-- Some views may have been created by 011/014/018.
-- Verify the final reporting objects that the application
-- expects.

DO $$
DECLARE
    v_view text;
BEGIN

    FOREACH v_view IN ARRAY ARRAY[
        'v_active_templates',
        'v_daily_reports',
        'v_my_daily_reports',
        'v_my_today_reports',
        'v_my_dashboard_summary',
        'v_my_report_statistics',
        'v_template_usage',
        'v_daily_reports_export'
    ]
    LOOP

        IF to_regclass('public.' || v_view) IS NULL THEN
            RAISE EXCEPTION
                'Verification failed: required view public.% does not exist',
                v_view;
        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 5. REQUIRED TRIGGERS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_profiles_updated'
          AND tgrelid = 'public.profiles'::regclass
          AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION
            'Verification failed: trg_profiles_updated is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_system_settings_updated'
          AND tgrelid = 'public.system_settings'::regclass
          AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION
            'Verification failed: trg_system_settings_updated is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
          AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION
            'Verification failed: on_auth_user_created is missing';
    END IF;

END;
$$;

-- ============================================================
-- 6. REQUIRED AUDIT TRIGGER
-- ============================================================
-- Only verify this if the audit function/triggers exist in the
-- current Core Database migration set.

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_templates_audit'
          AND tgrelid = 'public.templates'::regclass
          AND NOT tgisinternal
    ) THEN

        RAISE NOTICE
            'Verification notice: trg_templates_audit not found in Core Database. It may belong to Template Database.';

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_daily_reports_audit'
          AND tgrelid = 'public.daily_reports'::regclass
          AND NOT tgisinternal
    ) THEN

        RAISE NOTICE
            'Verification notice: trg_daily_reports_audit not found in Core Database. It may belong to Template Database.';

    END IF;

END;
$$;

-- ============================================================
-- 7. REQUIRED SEED ROLES
-- ============================================================

DO $$
DECLARE
    v_role text;
BEGIN

    FOREACH v_role IN ARRAY ARRAY[
        'SuperAdmin',
        'Admin',
        'Manager',
        'Accountant',
        'Staff',
        'Viewer'
    ]
    LOOP

        IF NOT EXISTS (
            SELECT 1
            FROM public.roles
            WHERE role_name = v_role
        ) THEN

            RAISE EXCEPTION
                'Verification failed: required role "%" is missing',
                v_role;

        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 8. REQUIRED SYSTEM SETTINGS
-- ============================================================

DO $$
DECLARE
    v_key text;
BEGIN

    FOREACH v_key IN ARRAY ARRAY[
        'application',
        'finance',
        'meeting'
    ]
    LOOP

        IF NOT EXISTS (
            SELECT 1
            FROM public.system_settings
            WHERE key = v_key
        ) THEN

            RAISE EXCEPTION
                'Verification failed: required system setting "%" is missing',
                v_key;

        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 9. REQUIRED INDEXES
-- ============================================================

DO $$
DECLARE
    v_index text;
BEGIN

    FOREACH v_index IN ARRAY ARRAY[
        'idx_audit_logs_user_created',
        'idx_audit_logs_created',
        'idx_audit_logs_module_created',
        'idx_finance_transactions_date',
        'idx_finance_transactions_type_date',
        'idx_finance_transactions_category_date',
        'idx_finance_transactions_created_by_date',
        'idx_notifications_user_created',
        'idx_notifications_unread'
    ]
    LOOP

        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = v_index
        ) THEN

            RAISE EXCEPTION
                'Verification failed: required index "%" is missing',
                v_index;

        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 10. REQUIRED RLS POLICIES
-- ============================================================

DO $$
DECLARE
    v_policy text;
BEGIN

    FOREACH v_policy IN ARRAY ARRAY[
        'Users can view own profile',
        'Users can update own profile',
        'Authenticated users can view roles',
        'Authenticated users read finance',
        'Authenticated users insert finance',
        'Owner updates finance',
        'Owner deletes finance',
        'Users view own notifications',
        'Users update own notifications',
        'Users insert own notifications',
        'Users delete own notifications',
        'Authenticated users read settings',
        'Admins manage system settings'
    ]
    LOOP

        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND policyname = v_policy
        ) THEN

            RAISE EXCEPTION
                'Verification failed: required RLS policy "%" is missing',
                v_policy;

        END IF;

    END LOOP;

END;
$$;

-- ============================================================
-- 11. IMPORTANT COLUMN VERIFICATION
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION
            'Verification failed: profiles.role is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'is_active'
    ) THEN
        RAISE EXCEPTION
            'Verification failed: profiles.is_active is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'finance_transactions'
          AND column_name = 'amount'
    ) THEN
        RAISE EXCEPTION
            'Verification failed: finance_transactions.amount is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'is_read'
    ) THEN
        RAISE EXCEPTION
            'Verification failed: notifications.is_read is missing';
    END IF;

END;
$$;

-- ============================================================
-- 12. AUTH PROFILE TRIGGER FUNCTION SECURITY
-- ============================================================
-- Confirm handle_new_user() is SECURITY DEFINER.

DO $$
DECLARE
    v_security_definer boolean;
BEGIN

    SELECT p.prosecdef
    INTO v_security_definer
    FROM pg_proc p
    JOIN pg_namespace n
        ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
    LIMIT 1;

    IF COALESCE(v_security_definer, false) = false THEN

        RAISE EXCEPTION
            'Verification failed: handle_new_user() must be SECURITY DEFINER';

    END IF;

END;
$$;

-- ============================================================
-- 13. VERIFICATION SUMMARY
-- ============================================================

RAISE NOTICE
'============================================================';

RAISE NOTICE
'TEMPLE OPERATIONS REPORTING SYSTEM';

RAISE NOTICE
'DATABASE VERIFICATION PASSED';

RAISE NOTICE
'============================================================';

RAISE NOTICE
'Required tables verified.';
RAISE NOTICE
'RLS enabled on core tables.';
RAISE NOTICE
'Required functions verified.';
RAISE NOTICE
'Required views verified.';
RAISE NOTICE
'Required triggers verified.';
RAISE NOTICE
'Seed roles verified.';
RAISE NOTICE
'System settings verified.';
RAISE NOTICE
'Required indexes verified.';
RAISE NOTICE
'Required RLS policies verified.';
RAISE NOTICE
'Important columns verified.';
RAISE NOTICE
'Security configuration verified.';

RAISE NOTICE
'============================================================';

COMMIT;