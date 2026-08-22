-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 007
-- File Name     : 007_rpc.sql
-- ============================================================
-- PURPOSE
--   Secure PostgreSQL RPC functions for:
--     - report saving
--     - report updating
--     - offline delta synchronization
--     - user report retrieval
--     - dashboard summaries
--     - template retrieval
--     - report statistics
--     - payload validation
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Offline-first synchronization
--   - Minimal unnecessary data transfer
--   - RLS remains effective
--
-- SECURITY
--   SECURITY INVOKER is intentionally used.
--
-- DEPENDS ON
--   001_extensions.sql
--   002_templates.sql
--   003_daily_reports.sql
--   004_indexes.sql
--   005_rls.sql
--   006_triggers.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SAVE / UPSERT REPORT
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_daily_report(
    p_report_date date,
    p_shift text,
    p_template_id uuid,
    p_stations jsonb DEFAULT '{}'::jsonb,
    p_status text DEFAULT 'draft',
    p_client_updated_at timestamptz DEFAULT now()
)
RETURNS public.daily_reports
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_report public.daily_reports;
    v_status text;
BEGIN

    -- --------------------------------------------------------
    -- Authentication
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- --------------------------------------------------------
    -- Basic input validation
    -- --------------------------------------------------------

    IF p_report_date IS NULL THEN
        RAISE EXCEPTION 'Report date is required';
    END IF;

    IF p_shift IS NULL
       OR length(trim(p_shift)) = 0 THEN
        RAISE EXCEPTION 'Shift is required';
    END IF;

    IF p_template_id IS NULL THEN
        RAISE EXCEPTION 'Template ID is required';
    END IF;

    IF p_stations IS NULL
       OR jsonb_typeof(p_stations) <> 'object' THEN
        RAISE EXCEPTION 'Stations payload must be a JSON object';
    END IF;

    v_status = COALESCE(NULLIF(trim(p_status), ''), 'draft');

    IF v_status NOT IN (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'archived'
    ) THEN
        RAISE EXCEPTION 'Invalid report status: %', v_status;
    END IF;

    -- --------------------------------------------------------
    -- Upsert
    -- --------------------------------------------------------

    INSERT INTO public.daily_reports (
        report_date,
        shift,
        template_id,
        user_id,
        stations,
        status,
        client_updated_at
    )
    VALUES (
        p_report_date,
        trim(p_shift),
        p_template_id,
        auth.uid(),
        p_stations,
        v_status,
        p_client_updated_at
    )

    ON CONFLICT (
        report_date,
        shift,
        template_id,
        user_id
    )

    DO UPDATE SET

        -- Accept the incoming report payload.
        stations = EXCLUDED.stations,

        status = EXCLUDED.status,

        client_updated_at = EXCLUDED.client_updated_at

    RETURNING *
    INTO v_report;

    RETURN v_report;

END;
$$;

-- ============================================================
-- 2. UPDATE REPORT
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_daily_report(
    p_report_date date,
    p_shift text,
    p_template_id uuid,
    p_stations jsonb,
    p_status text DEFAULT NULL,
    p_client_updated_at timestamptz DEFAULT now()
)
RETURNS public.daily_reports
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_report public.daily_reports;
    v_status text;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_stations IS NULL
       OR jsonb_typeof(p_stations) <> 'object' THEN
        RAISE EXCEPTION 'Stations payload must be a JSON object';
    END IF;

    v_status = NULLIF(trim(p_status), '');

    IF v_status IS NOT NULL
       AND v_status NOT IN (
           'draft',
           'submitted',
           'approved',
           'rejected',
           'archived'
       ) THEN
        RAISE EXCEPTION 'Invalid report status: %', v_status;
    END IF;

    UPDATE public.daily_reports
    SET
        stations = p_stations,

        status = COALESCE(
            v_status,
            status
        ),

        client_updated_at = COALESCE(
            p_client_updated_at,
            client_updated_at
        )

    WHERE report_date = p_report_date
      AND shift = trim(p_shift)
      AND template_id = p_template_id
      AND user_id = auth.uid()

    RETURNING *
    INTO v_report;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Daily report not found or not owned by current user';
    END IF;

    RETURN v_report;

END;
$$;

-- ============================================================
-- 3. DELTA SYNC RPC
-- ============================================================
--
-- Returns only reports belonging to the authenticated user
-- that changed after p_since.
--
-- Maximum response size is intentionally limited.
-- Client can call repeatedly using the newest updated_at value.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_daily_reports_delta(
    p_since timestamptz DEFAULT NULL,
    p_limit integer DEFAULT 500
)
RETURNS SETOF public.daily_reports
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT dr.*
    FROM public.daily_reports AS dr
    WHERE dr.user_id = auth.uid()

      AND (
          p_since IS NULL
          OR dr.updated_at > p_since
      )

    ORDER BY
        dr.updated_at ASC,
        dr.report_date ASC

    LIMIT LEAST(
        GREATEST(
            COALESCE(p_limit, 500),
            1
        ),
        2000
    );
$$;

-- ============================================================
-- 4. GET USER REPORTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_daily_reports(
    p_report_date date DEFAULT NULL,
    p_limit integer DEFAULT 100
)
RETURNS SETOF public.daily_reports
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT dr.*
    FROM public.daily_reports AS dr
    WHERE dr.user_id = auth.uid()

      AND (
          p_report_date IS NULL
          OR dr.report_date = p_report_date
      )

    ORDER BY
        dr.report_date DESC,
        dr.updated_at DESC

    LIMIT LEAST(
        GREATEST(
            COALESCE(p_limit, 100),
            1
        ),
        1000
    );
$$;

-- ============================================================
-- 5. DASHBOARD SUMMARY
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_dashboard_summary(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    total_reports bigint,
    draft_reports bigint,
    submitted_reports bigint,
    approved_reports bigint,
    rejected_reports bigint,
    archived_reports bigint,
    active_days bigint,
    last_updated_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::bigint,

        COUNT(*) FILTER (
            WHERE status = 'draft'
        )::bigint,

        COUNT(*) FILTER (
            WHERE status = 'submitted'
        )::bigint,

        COUNT(*) FILTER (
            WHERE status = 'approved'
        )::bigint,

        COUNT(*) FILTER (
            WHERE status = 'rejected'
        )::bigint,

        COUNT(*) FILTER (
            WHERE status = 'archived'
        )::bigint,

        COUNT(DISTINCT report_date)::bigint,

        MAX(updated_at)

    FROM public.daily_reports

    WHERE user_id = auth.uid()

      AND (
          p_from_date IS NULL
          OR report_date >= p_from_date
      )

      AND (
          p_to_date IS NULL
          OR report_date <= p_to_date
      );
$$;

-- ============================================================
-- 6. ACTIVE TEMPLATE LIST
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_templates(
    p_limit integer DEFAULT 100
)
RETURNS SETOF public.templates
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT t.*
    FROM public.templates AS t
    WHERE t.is_active = true

    ORDER BY
        t.updated_at DESC

    LIMIT LEAST(
        GREATEST(
            COALESCE(p_limit, 100),
            1
        ),
        500
    );
$$;

-- ============================================================
-- 7. REPORT STATISTICS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_report_statistics(
    p_from_date date DEFAULT NULL,
    p_to_date date DEFAULT NULL
)
RETURNS TABLE (
    template_id uuid,
    report_count bigint,
    first_report_date date,
    last_report_date date
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        dr.template_id,

        COUNT(*)::bigint,

        MIN(dr.report_date),

        MAX(dr.report_date)

    FROM public.daily_reports AS dr

    WHERE dr.user_id = auth.uid()

      AND (
          p_from_date IS NULL
          OR dr.report_date >= p_from_date
      )

      AND (
          p_to_date IS NULL
          OR dr.report_date <= p_to_date
      )

    GROUP BY
        dr.template_id

    ORDER BY
        COUNT(*) DESC;
$$;

-- ============================================================
-- 8. VALIDATION HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_report_payload(
    p_stations jsonb
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_typeof(p_stations) = 'object';
$$;

-- ============================================================
-- 9. FUNCTION COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.save_daily_report(
    date,
    text,
    uuid,
    jsonb,
    text,
    timestamptz
)
IS
'Authenticated upsert for the current user daily report.';

COMMENT ON FUNCTION public.update_daily_report(
    date,
    text,
    uuid,
    jsonb,
    text,
    timestamptz
)
IS
'Authenticated update for the current user daily report.';

COMMENT ON FUNCTION public.get_daily_reports_delta(
    timestamptz,
    integer
)
IS
'Returns current-user reports changed after the supplied synchronization timestamp.';

COMMENT ON FUNCTION public.get_my_daily_reports(
    date,
    integer
)
IS
'Returns current-user daily reports with optional date filtering.';

COMMENT ON FUNCTION public.get_my_dashboard_summary(
    date,
    date
)
IS
'Returns current-user dashboard report counts for an optional date range.';

COMMENT ON FUNCTION public.get_active_templates(
    integer
)
IS
'Returns active templates available to authenticated users.';

COMMENT ON FUNCTION public.get_my_report_statistics(
    date,
    date
)
IS
'Returns current-user report counts grouped by template.';

COMMENT ON FUNCTION public.validate_report_payload(
    jsonb
)
IS
'Validates that a report stations payload is a JSON object.';

COMMIT;