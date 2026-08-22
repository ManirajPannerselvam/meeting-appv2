-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 008
-- File Name     : 008_views.sql
-- ============================================================
-- PURPOSE
--   Read-only views for dashboards, analytics and exports.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent online users
--   - Template-driven daily reports
--   - Offline synchronization
--   - Long-term storage
--   - Low storage overhead
--
-- SECURITY
--   Views use SECURITY INVOKER so underlying RLS policies
--   remain effective for the calling user.
--
-- IMPORTANT
--   No materialized views are used.
--   No duplicate report data is stored.
--
-- DEPENDS ON
--   001_extensions.sql
--   002_templates.sql
--   003_daily_reports.sql
--   004_indexes.sql
--   005_rls.sql
--   006_triggers.sql
--   007_rpc.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ACTIVE TEMPLATES VIEW
-- ============================================================
--
-- Used by the template selection UI.
-- Only active templates are returned.
-- ============================================================

CREATE OR REPLACE VIEW public.v_active_templates
WITH (security_invoker = true)
AS
SELECT
    t.template_id,
    t.template_name,
    t.template_code,
    t.template_type,
    t.category,
    t.department,
    t.description,
    t.station_keys,
    t.fields,
    t.metadata,
    t.dict_version,
    t.version,
    t.is_active,
    t.created_by,
    t.created_at,
    t.updated_at
FROM public.templates AS t
WHERE t.is_active = true;

-- ============================================================
-- 2. DAILY REPORTS VIEW
-- ============================================================
--
-- General reporting view.
--
-- SECURITY INVOKER ensures access is still controlled by
-- the underlying daily_reports/templates permissions and RLS.
-- ============================================================

CREATE OR REPLACE VIEW public.v_daily_reports
WITH (security_invoker = true)
AS
SELECT
    dr.report_date,
    dr.shift,
    dr.template_id,

    t.template_name,
    t.template_code,

    dr.user_id,
    dr.stations,
    dr.status,
    dr.client_updated_at,
    dr.created_at,
    dr.updated_at,
    dr.deleted_at

FROM public.daily_reports AS dr

LEFT JOIN public.templates AS t
    ON t.template_id = dr.template_id;

-- ============================================================
-- 3. CURRENT USER REPORTS VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_daily_reports
WITH (security_invoker = true)
AS
SELECT
    dr.report_date,
    dr.shift,
    dr.template_id,

    t.template_name,
    t.template_code,

    dr.user_id,
    dr.stations,
    dr.status,
    dr.client_updated_at,
    dr.created_at,
    dr.updated_at,
    dr.deleted_at

FROM public.daily_reports AS dr

LEFT JOIN public.templates AS t
    ON t.template_id = dr.template_id

WHERE dr.user_id = auth.uid();

-- ============================================================
-- 4. TODAY'S CURRENT USER REPORTS
-- ============================================================
--
-- Uses the database/session current date.
--
-- For the application UI, the client should preferably send
-- an explicit report_date when timezone-sensitive behavior
-- is required.
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_today_reports
WITH (security_invoker = true)
AS
SELECT
    report_date,
    shift,
    template_id,
    template_name,
    template_code,
    user_id,
    stations,
    status,
    client_updated_at,
    created_at,
    updated_at,
    deleted_at

FROM public.v_my_daily_reports

WHERE report_date = CURRENT_DATE;

-- ============================================================
-- 5. CURRENT USER DASHBOARD SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_dashboard_summary
WITH (security_invoker = true)
AS
SELECT
    COUNT(*)::bigint
        AS total_reports,

    COUNT(*) FILTER (
        WHERE status = 'draft'
    )::bigint
        AS draft_reports,

    COUNT(*) FILTER (
        WHERE status = 'submitted'
    )::bigint
        AS submitted_reports,

    COUNT(*) FILTER (
        WHERE status = 'approved'
    )::bigint
        AS approved_reports,

    COUNT(*) FILTER (
        WHERE status = 'rejected'
    )::bigint
        AS rejected_reports,

    COUNT(*) FILTER (
        WHERE status = 'archived'
    )::bigint
        AS archived_reports,

    COUNT(DISTINCT report_date)::bigint
        AS active_days,

    MAX(updated_at)
        AS last_updated_at

FROM public.daily_reports

WHERE user_id = auth.uid();

-- ============================================================
-- 6. CURRENT USER REPORT STATISTICS
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_report_statistics
WITH (security_invoker = true)
AS
SELECT
    dr.template_id,

    t.template_name,
    t.template_code,

    COUNT(*)::bigint
        AS report_count,

    MIN(dr.report_date)
        AS first_report_date,

    MAX(dr.report_date)
        AS last_report_date

FROM public.daily_reports AS dr

LEFT JOIN public.templates AS t
    ON t.template_id = dr.template_id

WHERE dr.user_id = auth.uid()

GROUP BY
    dr.template_id,
    t.template_name,
    t.template_code;

-- ============================================================
-- 7. TEMPLATE USAGE VIEW
-- ============================================================
--
-- Important:
--   security_invoker = true
--
-- Therefore this view does not create a security hole by
-- bypassing the underlying RLS policies.
--
-- For an administrator using an appropriate privileged context,
-- this can be used for template usage / retention monitoring.
-- ============================================================

CREATE OR REPLACE VIEW public.v_template_usage
WITH (security_invoker = true)
AS
SELECT
    t.template_id,
    t.template_name,
    t.template_code,
    t.version,
    t.is_active,

    COUNT(dr.report_date)::bigint
        AS report_count,

    COUNT(DISTINCT dr.user_id)::bigint
        AS user_count,

    MAX(dr.updated_at)
        AS last_report_updated_at

FROM public.templates AS t

LEFT JOIN public.daily_reports AS dr
    ON dr.template_id = t.template_id

GROUP BY
    t.template_id,
    t.template_name,
    t.template_code,
    t.version,
    t.is_active;

-- ============================================================
-- 8. EXPORT VIEW
-- ============================================================
--
-- Compact reporting/export view.
--
-- The stations JSONB payload remains intact.
-- No duplicated station columns are created.
--
-- This supports:
--   JSON export
--   CSV export
--   PDF generation
--   application-side report generation
-- ============================================================

CREATE OR REPLACE VIEW public.v_daily_reports_export
WITH (security_invoker = true)
AS
SELECT
    dr.report_date,
    dr.shift,
    dr.template_id,

    t.template_name,
    t.template_code,

    dr.user_id,
    dr.status,
    dr.stations,
    dr.client_updated_at,
    dr.created_at,
    dr.updated_at,
    dr.deleted_at

FROM public.daily_reports AS dr

LEFT JOIN public.templates AS t
    ON t.template_id = dr.template_id;

-- ============================================================
-- 9. VIEW COMMENTS
-- ============================================================

COMMENT ON VIEW public.v_active_templates IS
'Active template definitions used for template selection.';

COMMENT ON VIEW public.v_daily_reports IS
'Read-only daily report view joined with template information.';

COMMENT ON VIEW public.v_my_daily_reports IS
'Current authenticated user daily reports.';

COMMENT ON VIEW public.v_my_today_reports IS
'Current authenticated user daily reports for CURRENT_DATE.';

COMMENT ON VIEW public.v_my_dashboard_summary IS
'Current authenticated user dashboard report summary.';

COMMENT ON VIEW public.v_my_report_statistics IS
'Current authenticated user report statistics grouped by template.';

COMMENT ON VIEW public.v_template_usage IS
'Template usage statistics protected by security-invoker execution and underlying RLS.';

COMMENT ON VIEW public.v_daily_reports_export IS
'Compact export-oriented daily report view.';

COMMIT;