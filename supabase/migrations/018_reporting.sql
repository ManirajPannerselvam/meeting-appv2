-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 018
-- File Name     : 018_reporting.sql
-- ============================================================
-- PURPOSE
--   Reporting and analytics functions for dashboards,
--   finance summaries, notification metrics and audit reporting.
--
-- DESIGN
--   - Read-only reporting operations
--   - SECURITY INVOKER
--   - Existing RLS remains effective
--   - No service-role bypass
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
--   010_rpc.sql
--   014_views.sql
--   015_permissions.sql
--   017_functions.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USER DASHBOARD REPORT
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_report(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    total_finance_transactions bigint,
    total_income numeric,
    total_expense numeric,
    net_amount numeric,
    unread_notifications bigint,
    total_audit_events bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        (
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
              )
        ),

        (
            SELECT COALESCE(SUM(f.amount), 0)
            FROM public.finance_transactions f
            WHERE f.created_by = auth.uid()
              AND lower(f.transaction_type) = 'income'
              AND (
                  p_from_date IS NULL
                  OR f.transaction_date >= p_from_date
              )
              AND (
                  p_to_date IS NULL
                  OR f.transaction_date <= p_to_date
              )
        ),

        (
            SELECT COALESCE(SUM(f.amount), 0)
            FROM public.finance_transactions f
            WHERE f.created_by = auth.uid()
              AND lower(f.transaction_type) = 'expense'
              AND (
                  p_from_date IS NULL
                  OR f.transaction_date >= p_from_date
              )
              AND (
                  p_to_date IS NULL
                  OR f.transaction_date <= p_to_date
              )
        ),

        (
            SELECT COALESCE(SUM(f.amount), 0)
            FROM public.finance_transactions f
            WHERE f.created_by = auth.uid()
              AND (
                  p_from_date IS NULL
                  OR f.transaction_date >= p_from_date
              )
              AND (
                  p_to_date IS NULL
                  OR f.transaction_date <= p_to_date
              )
        ),

        (
            SELECT COUNT(*)::bigint
            FROM public.notifications n
            WHERE n.user_id = auth.uid()
              AND n.is_read = false
        ),

        (
            SELECT COUNT(*)::bigint
            FROM public.audit_logs a
            WHERE a.user_id = auth.uid()
              AND (
                  p_from_date IS NULL
                  OR a.created_at::date >= p_from_date
              )
              AND (
                  p_to_date IS NULL
                  OR a.created_at::date <= p_to_date
              )
        );
$$;

-- ============================================================
-- 2. FINANCE SUMMARY BY CATEGORY
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_finance_summary_by_category(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    category text,
    transaction_count bigint,
    total_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        f.category,
        COUNT(*)::bigint AS transaction_count,
        COALESCE(SUM(f.amount), 0) AS total_amount
    FROM public.finance_transactions f
    WHERE f.created_by = auth.uid()
      AND (
          p_from_date IS NULL
          OR f.transaction_date >= p_from_date
      )
      AND (
          p_to_date IS NULL
          OR f.transaction_date <= p_to_date
      )
    GROUP BY f.category
    ORDER BY total_amount DESC;
$$;

-- ============================================================
-- 3. FINANCE SUMMARY BY TYPE
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_finance_summary_by_type(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    transaction_type text,
    transaction_count bigint,
    total_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        f.transaction_type,
        COUNT(*)::bigint AS transaction_count,
        COALESCE(SUM(f.amount), 0) AS total_amount
    FROM public.finance_transactions f
    WHERE f.created_by = auth.uid()
      AND (
          p_from_date IS NULL
          OR f.transaction_date >= p_from_date
      )
      AND (
          p_to_date IS NULL
          OR f.transaction_date <= p_to_date
      )
    GROUP BY f.transaction_type
    ORDER BY total_amount DESC;
$$;

-- ============================================================
-- 4. FINANCE DAILY SUMMARY
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_finance_daily_summary(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    transaction_date date,
    transaction_count bigint,
    total_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        f.transaction_date,
        COUNT(*)::bigint AS transaction_count,
        COALESCE(SUM(f.amount), 0) AS total_amount
    FROM public.finance_transactions f
    WHERE f.created_by = auth.uid()
      AND (
          p_from_date IS NULL
          OR f.transaction_date >= p_from_date
      )
      AND (
          p_to_date IS NULL
          OR f.transaction_date <= p_to_date
      )
    GROUP BY f.transaction_date
    ORDER BY f.transaction_date DESC;
$$;

-- ============================================================
-- 5. NOTIFICATION SUMMARY
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_notification_summary()
RETURNS TABLE (
    total_notifications bigint,
    unread_notifications bigint,
    read_notifications bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::bigint AS total_notifications,
        COUNT(*) FILTER (
            WHERE is_read = false
        )::bigint AS unread_notifications,
        COUNT(*) FILTER (
            WHERE is_read = true
        )::bigint AS read_notifications
    FROM public.notifications
    WHERE user_id = auth.uid();
$$;

-- ============================================================
-- 6. USER AUDIT SUMMARY
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_audit_summary(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    action text,
    module text,
    event_count bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        a.action,
        a.module,
        COUNT(*)::bigint AS event_count
    FROM public.audit_logs a
    WHERE a.user_id = auth.uid()
      AND (
          p_from_date IS NULL
          OR a.created_at::date >= p_from_date
      )
      AND (
          p_to_date IS NULL
          OR a.created_at::date <= p_to_date
      )
    GROUP BY
        a.action,
        a.module
    ORDER BY event_count DESC;
$$;

-- ============================================================
-- 7. ADMIN USER SUMMARY
-- ============================================================
-- Only active administrators can obtain system-wide user
-- statistics.

CREATE OR REPLACE FUNCTION public.get_admin_user_summary()
RETURNS TABLE (
    total_users bigint,
    active_users bigint,
    inactive_users bigint,
    departments bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::bigint,
        COUNT(*) FILTER (
            WHERE is_active = true
        )::bigint,
        COUNT(*) FILTER (
            WHERE is_active = false
        )::bigint,
        COUNT(DISTINCT department)::bigint
    FROM public.profiles p
    WHERE EXISTS (
        SELECT 1
        FROM public.profiles admin
        WHERE admin.id = auth.uid()
          AND lower(admin.role) = 'admin'
          AND admin.is_active = true
    );
$$;

-- ============================================================
-- 8. ADMIN FINANCE SUMMARY
-- ============================================================
-- Returns system-wide finance totals only to active admins.

CREATE OR REPLACE FUNCTION public.get_admin_finance_summary(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    transaction_count bigint,
    total_income numeric,
    total_expense numeric,
    net_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::bigint,
        COALESCE(
            SUM(f.amount)
            FILTER (
                WHERE lower(f.transaction_type) = 'income'
            ),
            0
        ),
        COALESCE(
            SUM(f.amount)
            FILTER (
                WHERE lower(f.transaction_type) = 'expense'
            ),
            0
        ),
        COALESCE(SUM(f.amount), 0)
    FROM public.finance_transactions f
    WHERE EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(p.role) = 'admin'
          AND p.is_active = true
    )
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
-- 9. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.get_dashboard_report(date, date)
IS
'Returns the authenticated users combined dashboard metrics.';

COMMENT ON FUNCTION public.get_finance_summary_by_category(date, date)
IS
'Returns the authenticated users finance totals grouped by category.';

COMMENT ON FUNCTION public.get_finance_summary_by_type(date, date)
IS
'Returns the authenticated users finance totals grouped by transaction type.';

COMMENT ON FUNCTION public.get_finance_daily_summary(date, date)
IS
'Returns the authenticated users finance totals grouped by business date.';

COMMENT ON FUNCTION public.get_notification_summary()
IS
'Returns notification counts for the authenticated user.';

COMMENT ON FUNCTION public.get_my_audit_summary(date, date)
IS
'Returns authenticated-user audit events grouped by action and module.';

COMMENT ON FUNCTION public.get_admin_user_summary()
IS
'Returns system user statistics for active administrators.';

COMMENT ON FUNCTION public.get_admin_finance_summary(date, date)
IS
'Returns system-wide finance statistics for active administrators.';

COMMIT;