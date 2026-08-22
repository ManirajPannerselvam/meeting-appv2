-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 017
-- File Name     : 017_functions.sql
-- ============================================================
-- PURPOSE
--   Centralized application helper functions for common
--   user, notification, finance and system operations.
--
-- DESIGN
--   - SECURITY INVOKER by default
--   - Existing RLS remains active
--   - No service-role bypass
--   - Safe repeated execution
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
--   004_finance_transactions.sql
--   005_notifications.sql
--   006_system_settings.sql
--   007_rls_policies.sql
--   010_rpc.sql
--   015_permissions.sql
--   016_storage.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. GET CURRENT USER PROFILE
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS public.profiles
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT p
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
    LIMIT 1;
$$;

-- ============================================================
-- 2. GET CURRENT USER DEPARTMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_department()
RETURNS text
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT p.department
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
    LIMIT 1;
$$;

-- ============================================================
-- 3. GET CURRENT USER NOTIFICATION COUNT
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::bigint
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND n.is_read = false;
$$;

-- ============================================================
-- 4. MARK ALL NOTIFICATIONS AS READ
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

    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
      AND is_read = false;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated;

END;
$$;

-- ============================================================
-- 5. MARK SINGLE NOTIFICATION AS READ
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

    UPDATE public.notifications
    SET is_read = true
    WHERE id = p_notification_id
      AND user_id = auth.uid();

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated = 1;

END;
$$;

-- ============================================================
-- 6. FINANCE TRANSACTION TOTAL
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_finance_total(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(
        SUM(f.amount),
        0
    )
    FROM public.finance_transactions f
    WHERE f.created_by = auth.uid()
      AND (
          p_from_date IS NULL
          OR f.transaction_date >= p_from_date
      )
      AND (
          p_to_date IS NULL
          OR f.transaction_date <= p_to_date
      );
$$;

-- ============================================================
-- 7. FINANCE TRANSACTION COUNT
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_finance_transaction_count(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::bigint
    FROM public.finance_transactions f
    WHERE f.created_by = auth.uid()
      AND (
          p_from_date IS NULL
          OR f.transaction_date >= p_from_date
      )
      AND (
          p_to_date IS NULL
          OR f.transaction_date <= p_to_date
      );
$$;

-- ============================================================
-- 8. DELETE OWN NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_my_notification(
    p_notification_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted integer;
BEGIN

    DELETE FROM public.notifications
    WHERE id = p_notification_id
      AND user_id = auth.uid();

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted = 1;

END;
$$;

-- ============================================================
-- 9. CHECK USER ACTIVE STATUS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
    );
$$;

-- ============================================================
-- 10. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.get_current_profile()
IS
'Returns the active profile belonging to the authenticated user.';

COMMENT ON FUNCTION public.get_my_department()
IS
'Returns the active department of the authenticated user.';

COMMENT ON FUNCTION public.get_unread_notification_count()
IS
'Returns the unread notification count for the authenticated user.';

COMMENT ON FUNCTION public.mark_all_notifications_read()
IS
'Marks all notifications belonging to the authenticated user as read.';

COMMENT ON FUNCTION public.mark_notification_read(bigint)
IS
'Marks one notification belonging to the authenticated user as read.';

COMMENT ON FUNCTION public.get_my_finance_total(date, date)
IS
'Returns the current users finance transaction total for an optional date range.';

COMMENT ON FUNCTION public.get_my_finance_transaction_count(date, date)
IS
'Returns the current users finance transaction count for an optional date range.';

COMMENT ON FUNCTION public.delete_my_notification(bigint)
IS
'Deletes a notification belonging to the authenticated user.';

COMMENT ON FUNCTION public.is_current_user_active()
IS
'Checks whether the authenticated user has an active application profile.';

COMMIT;