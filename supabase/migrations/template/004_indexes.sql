-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 004
-- File Name     : 004_indexes.sql
-- ============================================================
-- PURPOSE
--   Create only high-value indexes for the template/reporting
--   workload.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent online users
--   - template-driven daily reports
--   - offline synchronization
--   - long-term storage with low index overhead
--
-- IMPORTANT
--   003_daily_reports.sql already creates several single-column
--   indexes. They are intentionally NOT duplicated here.
--
--   002_templates.sql also creates several template indexes.
--   They are intentionally NOT duplicated here.
--
-- DEPENDS ON
--   001_extensions.sql
--   002_templates.sql
--   003_daily_reports.sql
--
-- INDEXES ONLY
--   No tables, RLS, triggers, functions, or data changes.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TEMPLATE INDEXES
-- ============================================================
--
-- 002_templates.sql already indexes:
--   template_name
--   category
--   department
--   template_type
--   is_active
--   created_at
--   template_code (unique partial)
--
-- Therefore only workload-specific composite/retention indexes
-- are added here.
-- ============================================================

-- Fast lookup of templates currently available to users.
CREATE INDEX IF NOT EXISTS idx_templates_available
ON public.templates (lifecycle_status, updated_at DESC)
WHERE is_active = true
  AND lifecycle_status IN ('active', 'warning');

-- Fast lookup for 60/65-day unused-template maintenance.
CREATE INDEX IF NOT EXISTS idx_templates_usage_retention
ON public.templates (last_used_at ASC NULLS FIRST, template_id)
WHERE lifecycle_status IN ('active', 'warning');

-- Fast lookup of archived templates without scanning all templates.
CREATE INDEX IF NOT EXISTS idx_templates_archived
ON public.templates (updated_at DESC, template_id)
WHERE lifecycle_status = 'archived';

-- ============================================================
-- 2. DAILY REPORT INDEXES
-- ============================================================
--
-- 003_daily_reports.sql already indexes:
--   report_date
--   user_id
--   template_id
--   updated_at
--   status
--   (updated_at, user_id)
--
-- Do not duplicate those indexes.
-- ============================================================

-- Main dashboard/report query:
-- date -> template -> shift -> user.
CREATE INDEX IF NOT EXISTS idx_daily_reports_date_template_shift_user
ON public.daily_reports (
    report_date DESC,
    template_id,
    shift,
    user_id
);

-- Common user history query:
-- user -> date -> shift.
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date_shift
ON public.daily_reports (
    user_id,
    report_date DESC,
    shift
);

-- Template reporting:
-- template -> date -> shift.
CREATE INDEX IF NOT EXISTS idx_daily_reports_template_date_shift
ON public.daily_reports (
    template_id,
    report_date DESC,
    shift
);

-- Active operational reports only.
CREATE INDEX IF NOT EXISTS idx_daily_reports_active_date
ON public.daily_reports (
    report_date DESC,
    template_id,
    user_id
)
WHERE deleted_at IS NULL
  AND status <> 'archived';

-- Offline synchronization:
-- only rows that are still present and have a server update time.
CREATE INDEX IF NOT EXISTS idx_daily_reports_sync_active
ON public.daily_reports (
    updated_at DESC,
    user_id
)
WHERE deleted_at IS NULL;

-- ============================================================
-- 3. COMPOSITE INDEXES
-- ============================================================
--
-- Keep this section deliberately small.
-- Too many overlapping indexes increase storage and write cost.
-- ============================================================

-- Submitted/approval dashboards.
CREATE INDEX IF NOT EXISTS idx_daily_reports_status_date
ON public.daily_reports (
    status,
    report_date DESC,
    template_id
)
WHERE deleted_at IS NULL;

-- Reports waiting for synchronization/review.
CREATE INDEX IF NOT EXISTS idx_daily_reports_pending_status
ON public.daily_reports (
    status,
    updated_at DESC,
    user_id
)
WHERE deleted_at IS NULL
  AND status IN ('draft', 'submitted', 'rejected');

-- ============================================================
-- 4. JSONB GIN INDEXES
-- ============================================================
--
-- Template JSONB is relatively stable, so GIN is appropriate for
-- containment/search operations.
--
-- jsonb_path_ops keeps the index focused on @> containment and
-- is generally smaller than the default jsonb_ops index.
--
-- Daily report stations can be very frequently updated.
-- Therefore NO default GIN index is created on daily_reports.stations.
-- This avoids unnecessary storage and write amplification for 30K+
-- users. Add one later only if EXPLAIN confirms real JSONB queries
-- need it.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_templates_station_keys_gin
ON public.templates
USING GIN (station_keys jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_templates_fields_gin
ON public.templates
USING GIN (fields jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_templates_metadata_gin
ON public.templates
USING GIN (metadata jsonb_path_ops);

-- ============================================================
-- 5. PARTIAL INDEXES
-- ============================================================
--
-- Partial indexes reduce index size by indexing only rows that
-- are normally queried.
-- ============================================================

-- Current templates.
CREATE INDEX IF NOT EXISTS idx_templates_active_only
ON public.templates (
    updated_at DESC,
    template_id
)
WHERE is_active = true
  AND lifecycle_status IN ('active', 'warning');

-- Reports currently usable by the application.
CREATE INDEX IF NOT EXISTS idx_daily_reports_current_only
ON public.daily_reports (
    report_date DESC,
    template_id,
    shift
)
WHERE deleted_at IS NULL
  AND status IN ('draft', 'submitted', 'approved', 'rejected');

-- Soft-deleted reports for retention/synchronization workflows.
CREATE INDEX IF NOT EXISTS idx_daily_reports_deleted_retention
ON public.daily_reports (
    deleted_at ASC,
    report_date ASC,
    user_id
)
WHERE deleted_at IS NOT NULL;

-- ============================================================
-- 6. SEARCH (pg_trgm) INDEXES
-- ============================================================
--
-- pg_trgm supports fast ILIKE/LIKE and similarity searches.
-- Use this only for user-facing fuzzy search.
--
-- These indexes are intentionally limited to template_name and
-- template_code. Do not add trigram indexes to every text column.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_templates_name_trgm
ON public.templates
USING GIN (template_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_templates_code_trgm
ON public.templates
USING GIN (template_code gin_trgm_ops)
WHERE template_code IS NOT NULL;

-- ============================================================
-- 7. COMMENTS
-- ============================================================

COMMENT ON INDEX public.idx_templates_available
IS 'Fast lookup of active and warning templates available to users.';

COMMENT ON INDEX public.idx_templates_usage_retention
IS 'Supports 60/65-day template usage warning and archive workflows.';

COMMENT ON INDEX public.idx_templates_archived
IS 'Supports archived-template administration without a full-table scan.';

COMMENT ON INDEX public.idx_daily_reports_date_template_shift_user
IS 'Primary dashboard/report lookup by date, template, shift and user.';

COMMENT ON INDEX public.idx_daily_reports_user_date_shift
IS 'Fast user report history lookup.';

COMMENT ON INDEX public.idx_daily_reports_template_date_shift
IS 'Fast template-based reporting by date and shift.';

COMMENT ON INDEX public.idx_daily_reports_active_date
IS 'Partial index for non-deleted, non-archived reports.';

COMMENT ON INDEX public.idx_daily_reports_sync_active
IS 'Supports active offline synchronization queries.';

COMMENT ON INDEX public.idx_templates_station_keys_gin
IS 'GIN containment index for template station configuration JSONB.';

COMMENT ON INDEX public.idx_templates_fields_gin
IS 'GIN containment index for template field-definition JSONB.';

COMMENT ON INDEX public.idx_templates_metadata_gin
IS 'GIN containment index for template metadata JSONB.';

COMMENT ON INDEX public.idx_templates_name_trgm
IS 'Trigram search index for user-friendly template-name search.';

COMMENT ON INDEX public.idx_templates_code_trgm
IS 'Trigram search index for user-friendly template-code search.';

COMMIT;
