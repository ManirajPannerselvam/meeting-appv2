-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 019
-- File Name     : 019_cleanup.sql
-- ============================================================
-- PURPOSE
--   Controlled cleanup and retention functions for application
--   data that does not need to remain indefinitely.
--
-- DESIGN
--   - SECURITY INVOKER
--   - Admin-only cleanup operations
--   - Minimum retention limits enforced
--   - No automatic destructive cleanup
--   - Safe repeated execution
--
-- DEPENDS ON
--   003_audit_logs.sql
--   005_notifications.sql
--   006_system_settings.sql
--   007_rls_policies.sql
--   017_functions.sql
--   018_reporting.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CLEANUP OLD AUDIT LOGS
-- ============================================================
-- Default retention: 180 days.
-- Minimum retention: 30 days.
--
-- Only active administrators can execute this function.

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
    p_retention_days integer DEFAULT 180
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted bigint;
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(p.role) = 'admin'
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;

    IF p_retention_days < 30 THEN
        RAISE EXCEPTION
            'Audit retention cannot be less than 30 days';
    END IF;

    DELETE FROM public.audit_logs
    WHERE created_at <
          now() - make_interval(days => p_retention_days);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;
$$;

-- ============================================================
-- 2. CLEANUP OLD READ NOTIFICATIONS
-- ============================================================
-- Default retention: 90 days.
-- Minimum retention: 7 days.
--
-- Only active administrators can execute this function.

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(
    p_retention_days integer DEFAULT 90
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted bigint;
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(p.role) = 'admin'
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;

    IF p_retention_days < 7 THEN
        RAISE EXCEPTION
            'Notification retention cannot be less than 7 days';
    END IF;

    DELETE FROM public.notifications
    WHERE is_read = true
      AND created_at <
          now() - make_interval(days => p_retention_days);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;
$$;

-- ============================================================
-- 3. CLEANUP ALL RETAINABLE DATA
-- ============================================================
-- Runs the approved cleanup operations together.
--
-- Audit logs:
--   180 days minimum
--
-- Read notifications:
--   90 days minimum
--
-- Returns the number of deleted rows from each category.

CREATE OR REPLACE FUNCTION public.run_cleanup(
    p_audit_retention_days integer DEFAULT 180,
    p_notification_retention_days integer DEFAULT 90
)
RETURNS TABLE (
    audit_deleted bigint,
    notifications_deleted bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(p.role) = 'admin'
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;

    IF p_audit_retention_days < 30 THEN
        RAISE EXCEPTION
            'Audit retention cannot be less than 30 days';
    END IF;

    IF p_notification_retention_days < 7 THEN
        RAISE EXCEPTION
            'Notification retention cannot be less than 7 days';
    END IF;

    DELETE FROM public.audit_logs
    WHERE created_at <
          now() - make_interval(
              days => p_audit_retention_days
          );

    GET DIAGNOSTICS audit_deleted = ROW_COUNT;

    DELETE FROM public.notifications
    WHERE is_read = true
      AND created_at <
          now() - make_interval(
              days => p_notification_retention_days
          );

    GET DIAGNOSTICS notifications_deleted = ROW_COUNT;

    RETURN NEXT;

END;
$$;

-- ============================================================
-- 4. CLEANUP PREVIEW
-- ============================================================
-- Read-only preview.
-- Allows an administrator to see how many rows would be
-- removed before executing cleanup.

CREATE OR REPLACE FUNCTION public.get_cleanup_preview(
    p_audit_retention_days integer DEFAULT 180,
    p_notification_retention_days integer DEFAULT 90
)
RETURNS TABLE (
    audit_rows_to_delete bigint,
    notification_rows_to_delete bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        (
            SELECT COUNT(*)::bigint
            FROM public.audit_logs a
            WHERE a.created_at <
                  now() - make_interval(
                      days => p_audit_retention_days
                  )
        ) AS audit_rows_to_delete,

        (
            SELECT COUNT(*)::bigint
            FROM public.notifications n
            WHERE n.is_read = true
              AND n.created_at <
                  now() - make_interval(
                      days => p_notification_retention_days
                  )
        ) AS notification_rows_to_delete
    WHERE EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(p.role) = 'admin'
          AND p.is_active = true
    );
$$;

-- ============================================================
-- 5. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.cleanup_old_audit_logs(integer)
IS
'Deletes audit records older than the configured retention period. Active administrators only.';

COMMENT ON FUNCTION public.cleanup_old_notifications(integer)
IS
'Deletes old read notifications. Active administrators only.';

COMMENT ON FUNCTION public.run_cleanup(integer, integer)
IS
'Executes approved audit-log and notification retention cleanup. Active administrators only.';

COMMENT ON FUNCTION public.get_cleanup_preview(integer, integer)
IS
'Shows how many audit and notification rows qualify for cleanup without deleting anything.';

COMMIT;