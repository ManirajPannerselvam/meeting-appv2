-- ============================================================
-- 003_daily_reports.sql
-- Temple Operations Reporting System
-- Production / Long-Term / 30,000+ Users
-- ============================================================
-- PURPOSE
--   Store template-driven daily reports with JSONB payloads,
--   offline synchronization, soft deletion and controlled retention.
--
-- IMPORTANT
--   - One row represents one user/report-date/shift/template.
--   - The template definition is stored once in public.templates.
--   - Station values are stored in the report JSONB payload.
--   - This migration does NOT automatically delete old reports.
--   - RLS is included here so the table is protected immediately.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_reports (
    report_date date NOT NULL,
    shift text NOT NULL,
    template_id uuid NOT NULL,
    user_id uuid NOT NULL,

    -- Dynamic station/report payload.
    -- Keep keys compact in the application dictionary.
    stations jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Report lifecycle.
    status text NOT NULL DEFAULT 'draft',

    -- Offline synchronization.
    client_updated_at timestamptz,

    -- Server timestamps.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Soft delete / retention workflow.
    deleted_at timestamptz
);

-- ============================================================
-- 2. PRIMARY KEY
-- ============================================================

ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_pkey;

ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_pkey
PRIMARY KEY (
    report_date,
    shift,
    template_id,
    user_id
);

-- ============================================================
-- 3. FOREIGN KEY - USER
-- ============================================================

ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_user_id_fkey;

ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- ============================================================
-- 4. FOREIGN KEY - TEMPLATE
-- ============================================================

ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_template_id_fkey;

ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_template_id_fkey
FOREIGN KEY (template_id)
REFERENCES public.templates(template_id)
ON DELETE RESTRICT;

-- ============================================================
-- 5. COLUMN COMMENTS
-- ============================================================

COMMENT ON COLUMN public.daily_reports.report_date
IS 'Operational reporting date.';

COMMENT ON COLUMN public.daily_reports.shift
IS 'Operational shift identifier.';

COMMENT ON COLUMN public.daily_reports.template_id
IS 'Template definition used by this report.';

COMMENT ON COLUMN public.daily_reports.user_id
IS 'User who owns or submitted this report.';

COMMENT ON COLUMN public.daily_reports.stations
IS 'Compressed/compact JSONB station and field values defined by the selected template.';

COMMENT ON COLUMN public.daily_reports.status
IS 'Report lifecycle status.';

COMMENT ON COLUMN public.daily_reports.client_updated_at
IS 'Timestamp supplied by the offline client for synchronization.';

COMMENT ON COLUMN public.daily_reports.created_at
IS 'Server-side creation timestamp.';

COMMENT ON COLUMN public.daily_reports.updated_at
IS 'Server-side timestamp of the latest modification.';

COMMENT ON COLUMN public.daily_reports.deleted_at
IS 'Soft-delete timestamp used by retention and synchronization workflows.';

-- ============================================================
-- 6. STATUS CONSTRAINT
-- ============================================================

ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_status_check;

ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_status_check
CHECK (
    status IN (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'archived'
    )
);

-- ============================================================
-- 7. JSONB VALIDATION
-- ============================================================

ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_stations_object_check;

ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_stations_object_check
CHECK (
    jsonb_typeof(stations) = 'object'
);

-- ============================================================
-- 8. SHIFT VALIDATION
-- ============================================================

ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_shift_not_empty_check;

ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_shift_not_empty_check
CHECK (
    length(trim(shift)) > 0
);

-- ============================================================
-- 9. DEFAULTS
-- ============================================================

ALTER TABLE public.daily_reports
ALTER COLUMN stations SET DEFAULT '{}'::jsonb;

ALTER TABLE public.daily_reports
ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.daily_reports
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.daily_reports
ALTER COLUMN updated_at SET DEFAULT now();

-- ============================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================
-- Keep indexes deliberately limited for 30,000+ users.
-- Avoid indexing the JSONB payload unless a measured query requires it.

CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date
ON public.daily_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user
ON public.daily_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_template
ON public.daily_reports(template_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_updated_at
ON public.daily_reports(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_reports_status
ON public.daily_reports(status);

-- ============================================================
-- 11. SYNC INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_daily_reports_sync
ON public.daily_reports(updated_at DESC, user_id);

-- ============================================================
-- 12. SOFT-DELETE INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_daily_reports_deleted_at
ON public.daily_reports(deleted_at)
WHERE deleted_at IS NOT NULL;

-- ============================================================
-- 13. ACTIVE REPORT INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_daily_reports_active
ON public.daily_reports(
    report_date DESC,
    user_id,
    template_id
)
WHERE deleted_at IS NULL;

-- ============================================================
-- 14. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_daily_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============================================================
-- 15. UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_daily_reports_updated_at
ON public.daily_reports;

CREATE TRIGGER trg_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_daily_reports_updated_at();

-- ============================================================
-- 16. RETENTION SUPPORT
-- ============================================================
-- No automatic deletion is performed here.
-- Application/admin retention workflow may later:
--   1. archive old reports
--   2. export them
--   3. compress/archive them
--   4. delete them only after approval
--
-- This preserves long-term data and offline synchronization safety.

COMMENT ON TABLE public.daily_reports
IS 'Template-driven daily operational reports using JSONB station data. Designed for 30,000+ users, long-term retention, offline synchronization, soft deletion and controlled archival.';

-- ============================================================
-- 17. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 18. RLS POLICIES
-- ============================================================
-- Users can access only their own reports.
-- Supabase service_role bypasses RLS by design.
-- Admin-wide access should be implemented later through a
-- controlled role/claim policy, not by exposing all rows.

DROP POLICY IF EXISTS daily_reports_select_own
ON public.daily_reports;

CREATE POLICY daily_reports_select_own
ON public.daily_reports
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS daily_reports_insert_own
ON public.daily_reports;

CREATE POLICY daily_reports_insert_own
ON public.daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS daily_reports_update_own
ON public.daily_reports;

CREATE POLICY daily_reports_update_own
ON public.daily_reports
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS daily_reports_delete_own
ON public.daily_reports;

CREATE POLICY daily_reports_delete_own
ON public.daily_reports
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 19. FINAL
-- ============================================================

COMMIT;

-- ============================================================
-- END OF 003_daily_reports.sql
-- ============================================================
