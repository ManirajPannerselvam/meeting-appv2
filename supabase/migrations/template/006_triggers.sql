-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 006
-- File Name     : 006_triggers.sql
-- ============================================================
-- PURPOSE
--   Maintain server timestamps and validate template/report data.
--
-- DEPENDS ON
--   001_extensions.sql
--   002_templates.sql
--   003_daily_reports.sql
--   004_indexes.sql
--   005_rls.sql
--
-- IMPORTANT
--   This migration uses ONLY columns present in the supplied
--   002_templates.sql and 003_daily_reports.sql schemas.
--   No unsupported lifecycle/admin columns are assumed.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMMON UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============================================================
-- 2. TEMPLATE VALIDATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_template()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Required template name
    IF NEW.template_name IS NULL
       OR length(trim(NEW.template_name)) = 0 THEN
        RAISE EXCEPTION 'template_name cannot be empty';
    END IF;

    -- JSONB object validation
    IF NEW.station_keys IS NULL
       OR jsonb_typeof(NEW.station_keys) <> 'object' THEN
        RAISE EXCEPTION 'station_keys must be a JSON object';
    END IF;

    -- JSONB array validation
    IF NEW.fields IS NULL
       OR jsonb_typeof(NEW.fields) <> 'array' THEN
        RAISE EXCEPTION 'fields must be a JSON array';
    END IF;

    -- JSONB object validation
    IF NEW.metadata IS NULL
       OR jsonb_typeof(NEW.metadata) <> 'object' THEN
        RAISE EXCEPTION 'metadata must be a JSON object';
    END IF;

    -- Positive dictionary/template versions
    IF NEW.dict_version IS NULL OR NEW.dict_version <= 0 THEN
        RAISE EXCEPTION 'dict_version must be greater than zero';
    END IF;

    IF NEW.version IS NULL OR NEW.version <= 0 THEN
        RAISE EXCEPTION 'version must be greater than zero';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================
-- 3. DAILY REPORT VALIDATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_daily_report()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Shift must contain useful data
    IF NEW.shift IS NULL
       OR length(trim(NEW.shift)) = 0 THEN
        RAISE EXCEPTION 'shift cannot be empty';
    END IF;

    -- Stations must always be a JSON object
    IF NEW.stations IS NULL
       OR jsonb_typeof(NEW.stations) <> 'object' THEN
        RAISE EXCEPTION 'stations must be a JSON object';
    END IF;

    -- Status must remain within the supported lifecycle
    IF NEW.status IS NULL
       OR NEW.status NOT IN (
            'draft',
            'submitted',
            'approved',
            'rejected',
            'archived'
       ) THEN
        RAISE EXCEPTION
            'Invalid daily report status: %',
            NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================
-- 4. TEMPLATES TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_templates_updated_at
ON public.templates;

CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_templates_validate
ON public.templates;

CREATE TRIGGER trg_templates_validate
BEFORE INSERT OR UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.validate_template();

-- ============================================================
-- 5. DAILY REPORT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_daily_reports_updated_at
ON public.daily_reports;

CREATE TRIGGER trg_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_reports_validate
ON public.daily_reports;

CREATE TRIGGER trg_daily_reports_validate
BEFORE INSERT OR UPDATE ON public.daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_daily_report();

-- ============================================================
-- 6. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.set_updated_at()
IS 'Sets updated_at to the current server timestamp before row updates.';

COMMENT ON FUNCTION public.validate_template()
IS 'Validates template JSONB structures and positive version values.';

COMMENT ON FUNCTION public.validate_daily_report()
IS 'Validates daily report shift, station JSONB and status values.';

COMMIT;
