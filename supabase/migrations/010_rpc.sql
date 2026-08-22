-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 010
-- File Name     : 010_rpc.sql
-- ============================================================
-- PURPOSE
--   Secure PostgreSQL RPC functions for core application
--   operations.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - SECURITY INVOKER by default
--   - RLS remains active
--   - No unnecessary table scans
--   - Safe repeated migration execution
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
-- ============================================================

BEGIN;


-- ============================================================
-- 1. GET CURRENT USER PROFILE
-- ============================================================
-- Returns the authenticated user's own profile.
-- RLS remains active because this is SECURITY INVOKER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT p.*
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;
$$;


-- ============================================================
-- 2. UPDATE CURRENT USER PROFILE
-- ============================================================
-- Users can update only fields that belong to their profile.
--
-- role and is_active are intentionally NOT accepted here.
-- Users must not be able to promote/deactivate themselves.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_full_name text DEFAULT NULL,
    p_department text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_avatar_url text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile public.profiles;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.profiles
    SET
        full_name = COALESCE(p_full_name, full_name),
        department = COALESCE(p_department, department),
        phone = COALESCE(p_phone, phone),
        avatar_url = COALESCE(p_avatar_url, avatar_url)
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    RETURN v_profile;

END;
$$;


-- ============================================================
-- 3. GET ROLE LIST
-- ============================================================
-- Returns available role definitions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_roles(
    p_limit integer DEFAULT 50
)
RETURNS SETOF public.roles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT r.*
    FROM public.roles r
    ORDER BY r.id
    LIMIT LEAST(
        GREATEST(COALESCE(p_limit, 50), 1),
        100
    );
$$;


-- ============================================================
-- 4. GET MY NOTIFICATIONS
-- ============================================================
-- Returns notifications belonging only to the authenticated
-- user.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_notifications(
    p_limit integer DEFAULT 50,
    p_unread_only boolean DEFAULT false
)
RETURNS SETOF public.notifications
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT n.*
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND (
          p_unread_only = false
          OR n.is_read = false
      )
    ORDER BY n.created_at DESC
    LIMIT LEAST(
        GREATEST(COALESCE(p_limit, 50), 1),
        200
    );
$$;


-- ============================================================
-- 5. GET UNREAD NOTIFICATION COUNT
-- ============================================================
-- Small COUNT query supported by the partial unread index.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::bigint
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND n.is_read = false;
$$;


-- ============================================================
-- 6. MARK NOTIFICATION AS READ
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated integer;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.notifications
    SET is_read = true
    WHERE id = p_notification_id
      AND user_id = auth.uid()
      AND is_read = false;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated > 0;

END;
$$;


-- ============================================================
-- 7. MARK ALL MY NOTIFICATIONS AS READ
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated bigint;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
      AND is_read = false;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated;

END;
$$;


-- ============================================================
-- 8. CREATE FINANCE TRANSACTION
-- ============================================================
-- Only authorized finance roles can create transactions.
-- created_by is always forced to auth.uid().
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_finance_transaction(
    p_transaction_date date,
    p_transaction_type text,
    p_category text,
    p_amount numeric,
    p_description text DEFAULT NULL,
    p_payment_method text DEFAULT NULL,
    p_reference_no text DEFAULT NULL
)
RETURNS public.finance_transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_transaction public.finance_transactions;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant'
          )
    ) THEN
        RAISE EXCEPTION 'Finance permission required';
    END IF;

    IF p_transaction_date IS NULL THEN
        RAISE EXCEPTION 'Transaction date is required';
    END IF;

    IF p_transaction_type IS NULL
       OR length(trim(p_transaction_type)) = 0 THEN
        RAISE EXCEPTION 'Transaction type is required';
    END IF;

    IF p_category IS NULL
       OR length(trim(p_category)) = 0 THEN
        RAISE EXCEPTION 'Transaction category is required';
    END IF;

    IF p_amount IS NULL OR p_amount = 0 THEN
        RAISE EXCEPTION 'Transaction amount cannot be zero';
    END IF;

    INSERT INTO public.finance_transactions (
        transaction_date,
        transaction_type,
        category,
        description,
        amount,
        payment_method,
        reference_no,
        created_by
    )
    VALUES (
        p_transaction_date,
        trim(p_transaction_type),
        trim(p_category),
        p_description,
        p_amount,
        p_payment_method,
        p_reference_no,
        auth.uid()
    )
    RETURNING * INTO v_transaction;

    RETURN v_transaction;

END;
$$;


-- ============================================================
-- 9. GET FINANCE SUMMARY
-- ============================================================
-- Restricted to authorized finance roles.
--
-- Returns aggregated data instead of exposing unnecessary
-- transaction rows.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_finance_summary(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    transaction_count bigint,
    total_amount numeric,
    income_amount numeric,
    expense_amount numeric,
    first_transaction_date date,
    last_transaction_date date
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant',
              'manager'
          )
    ) THEN
        RAISE EXCEPTION 'Finance permission required';
    END IF;

    RETURN QUERY
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

        MIN(ft.transaction_date),

        MAX(ft.transaction_date)

    FROM public.finance_transactions ft;

END;
$$;


-- ============================================================
-- 10. GET SYSTEM SETTING
-- ============================================================
-- Reads one application setting.
-- RLS on system_settings remains active.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_system_setting(
    p_key text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT s.value
    FROM public.system_settings s
    WHERE s.key = p_key
    LIMIT 1;
$$;


-- ============================================================
-- 11. ADMIN UPDATE SYSTEM SETTING
-- ============================================================
-- Only Admin / SuperAdmin can modify settings.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_system_setting(
    p_key text,
    p_value jsonb
)
RETURNS public.system_settings
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_setting public.system_settings;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Administrator permission required';
    END IF;

    IF p_key IS NULL
       OR length(trim(p_key)) = 0 THEN
        RAISE EXCEPTION 'Setting key is required';
    END IF;

    INSERT INTO public.system_settings (
        key,
        value
    )
    VALUES (
        trim(p_key),
        COALESCE(p_value, '{}'::jsonb)
    )
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value
    RETURNING * INTO v_setting;

    RETURN v_setting;

END;
$$;


-- ============================================================
-- 12. CREATE USER NOTIFICATION
-- ============================================================
-- Trusted server-side/application operation.
--
-- SECURITY:
-- Normal authenticated users cannot call this function to
-- create arbitrary notifications because the function checks
-- that the caller is an Admin/SuperAdmin.
--
-- Application server code using the service role can also
-- perform notification inserts directly.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_title text,
    p_message text
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_notification public.notifications;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Administrator permission required';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Notification user is required';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        title,
        message
    )
    VALUES (
        p_user_id,
        p_title,
        p_message
    )
    RETURNING * INTO v_notification;

    RETURN v_notification;

END;
$$;


-- ============================================================
-- 13. AUDIT LOG INSERT RPC
-- ============================================================
-- Creates an audit record for the current user.
-- This is useful for explicit application actions such as
-- LOGIN, APPROVE, EXPORT, etc.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_action text,
    p_module text,
    p_record_id text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_old_data jsonb DEFAULT NULL,
    p_new_data jsonb DEFAULT NULL
)
RETURNS public.audit_logs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_log public.audit_logs;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        action,
        module,
        record_id,
        description,
        old_data,
        new_data
    )
    VALUES (
        auth.uid(),
        p_action,
        p_module,
        p_record_id,
        p_description,
        p_old_data,
        p_new_data
    )
    RETURNING * INTO v_log;

    RETURN v_log;

END;
$$;


-- ============================================================
-- 14. FUNCTION COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.get_my_profile()
IS
'Returns the authenticated user profile.';

COMMENT ON FUNCTION public.update_my_profile(
    text,
    text,
    text,
    text
)
IS
'Updates editable fields of the authenticated user profile. Role and active status cannot be changed through this RPC.';

COMMENT ON FUNCTION public.get_roles(integer)
IS
'Returns application role definitions.';

COMMENT ON FUNCTION public.get_my_notifications(integer, boolean)
IS
'Returns notifications belonging to the authenticated user.';

COMMENT ON FUNCTION public.get_unread_notification_count()
IS
'Returns the unread notification count for the authenticated user.';

COMMENT ON FUNCTION public.mark_notification_read(bigint)
IS
'Marks one notification as read when owned by the authenticated user.';

COMMENT ON FUNCTION public.mark_all_notifications_read()
IS
'Marks all notifications belonging to the authenticated user as read.';

COMMENT ON FUNCTION public.create_finance_transaction(
    date,
    text,
    text,
    numeric,
    text,
    text,
    text
)
IS
'Creates a finance transaction for an authorized finance user.';

COMMENT ON FUNCTION public.get_finance_summary(date, date)
IS
'Returns an aggregated finance summary for authorized users.';

COMMENT ON FUNCTION public.get_system_setting(text)
IS
'Returns one application system setting by key.';

COMMENT ON FUNCTION public.set_system_setting(text, jsonb)
IS
'Creates or updates an application system setting for Admin or SuperAdmin users.';

COMMENT ON FUNCTION public.create_notification(uuid, text, text)
IS
'Creates a notification for another user when called by an administrator.';

COMMENT ON FUNCTION public.create_audit_log(
    text,
    text,
    text,
    text,
    jsonb,
    jsonb
)
IS
'Creates an explicit application audit event for the authenticated user.';


COMMIT;