-- ============================================================
-- TEMPLATES
-- ============================================================
-- Table:
--   public.templates
--
-- Purpose:
--   Store template definitions ONCE.
--
-- Reports reference template_id instead of duplicating:
--   - fields
--   - formulas
--   - labels
--   - station definitions
--   - metadata
--
-- Lifecycle:
--   ACTIVE
--      ↓ 60 days unused
--   WARNING
--      ↓ 65 days unused
--   ARCHIVED
--
-- Archived templates are NOT physically deleted.
-- Historical reports remain readable.
--
-- Designed for:
--   - 30,000+ users
--   - ~200 concurrent users
--   - long-term operation
--   - offline reporting
--   - JSONB template definitions
--   - compressed report values
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.templates (

    -- --------------------------------------------------------
    -- Identity
    -- --------------------------------------------------------

    template_id uuid PRIMARY KEY
        DEFAULT gen_random_uuid(),

    template_name text NOT NULL,

    template_code text,

    template_type text,

    category text,

    department text,

    description text,


    -- --------------------------------------------------------
    -- Station configuration
    -- --------------------------------------------------------
    --
    -- Template definition only.
    -- Actual daily values belong in daily_reports.
    --

    station_keys jsonb NOT NULL
        DEFAULT '{}'::jsonb,


    -- --------------------------------------------------------
    -- Dynamic field definitions
    -- --------------------------------------------------------
    --
    -- Contains:
    --   field names
    --   labels
    --   types
    --   formulas
    --   validation
    --   dropdown definitions
    --
    -- This is stored ONCE per template.
    --

    fields jsonb NOT NULL
        DEFAULT '[]'::jsonb,


    -- --------------------------------------------------------
    -- Additional metadata
    -- --------------------------------------------------------

    metadata jsonb NOT NULL
        DEFAULT '{}'::jsonb,


    -- --------------------------------------------------------
    -- Dictionary version
    -- --------------------------------------------------------
    --
    -- Used by compressed report keys.
    --

    dict_version integer NOT NULL
        DEFAULT 1,


    -- --------------------------------------------------------
    -- Template version
    -- --------------------------------------------------------

    version integer NOT NULL
        DEFAULT 1,


    -- --------------------------------------------------------
    -- Active state
    -- --------------------------------------------------------

    is_active boolean NOT NULL
        DEFAULT true,


    -- --------------------------------------------------------
    -- Lifecycle state
    -- --------------------------------------------------------

    lifecycle_status text NOT NULL
        DEFAULT 'active',


    -- --------------------------------------------------------
    -- Last usage
    -- --------------------------------------------------------
    --
    -- Updated whenever this template is used to create/update
    -- a report.
    --

    last_used_at timestamptz,


    -- --------------------------------------------------------
    -- Archive information
    -- --------------------------------------------------------

    archived_at timestamptz,

    archive_reason text,


    -- --------------------------------------------------------
    -- Ownership
    -- --------------------------------------------------------

    created_by uuid,


    -- --------------------------------------------------------
    -- Timestamps
    -- --------------------------------------------------------

    created_at timestamptz NOT NULL
        DEFAULT now(),

    updated_at timestamptz NOT NULL
        DEFAULT now()

);


-- ============================================================
-- 2. BASIC CONSTRAINTS
-- ============================================================

ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_template_name_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_template_name_check
CHECK (
    length(trim(template_name)) > 0
);


ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_dict_version_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_dict_version_check
CHECK (
    dict_version > 0
);


ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_version_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_version_check
CHECK (
    version > 0
);


-- ============================================================
-- 3. JSONB VALIDATION
-- ============================================================

ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_station_keys_object_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_station_keys_object_check
CHECK (
    jsonb_typeof(station_keys) = 'object'
);


ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_fields_array_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_fields_array_check
CHECK (
    jsonb_typeof(fields) = 'array'
);


ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_metadata_object_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_metadata_object_check
CHECK (
    jsonb_typeof(metadata) = 'object'
);


-- ============================================================
-- 4. LIFECYCLE CONSTRAINT
-- ============================================================

ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_lifecycle_status_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_lifecycle_status_check
CHECK (
    lifecycle_status IN (
        'active',
        'warning',
        'archived'
    )
);


-- ============================================================
-- 5. ARCHIVE STATE VALIDATION
-- ============================================================

ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_archive_state_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_archive_state_check
CHECK (
    (
        lifecycle_status = 'archived'
        AND archived_at IS NOT NULL
    )
    OR
    (
        lifecycle_status <> 'archived'
    )
);


-- ============================================================
-- 6. ACTIVE STATE CONSISTENCY
-- ============================================================

ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_active_state_check;

ALTER TABLE public.templates
ADD CONSTRAINT templates_active_state_check
CHECK (
    (
        lifecycle_status = 'active'
        AND is_active = true
    )
    OR
    (
        lifecycle_status = 'warning'
        AND is_active = true
    )
    OR
    (
        lifecycle_status = 'archived'
        AND is_active = false
    )
);


-- ============================================================
-- 7. UNIQUE TEMPLATE CODE
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_templates_template_code_unique
ON public.templates(template_code)
WHERE template_code IS NOT NULL;


-- ============================================================
-- 8. NORMAL INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_templates_template_name
ON public.templates(template_name);


CREATE INDEX IF NOT EXISTS
idx_templates_category
ON public.templates(category);


CREATE INDEX IF NOT EXISTS
idx_templates_department
ON public.templates(department);


CREATE INDEX IF NOT EXISTS
idx_templates_type
ON public.templates(template_type);


CREATE INDEX IF NOT EXISTS
idx_templates_created_at
ON public.templates(created_at DESC);


CREATE INDEX IF NOT EXISTS
idx_templates_updated_at
ON public.templates(updated_at DESC);


-- ============================================================
-- 9. ACTIVE TEMPLATES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_templates_active
ON public.templates(is_active)
WHERE is_active = true;


-- ============================================================
-- 10. LIFECYCLE INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_templates_lifecycle
ON public.templates(lifecycle_status);


-- ============================================================
-- 11. LAST USED INDEX
-- ============================================================
--
-- Useful for finding templates that have not been used recently.
--

CREATE INDEX IF NOT EXISTS
idx_templates_last_used
ON public.templates(last_used_at);


-- ============================================================
-- 12. WARNING TEMPLATES
-- ============================================================
--
-- Partial index keeps this small.
--

CREATE INDEX IF NOT EXISTS
idx_templates_warning
ON public.templates(last_used_at)
WHERE lifecycle_status = 'warning';


-- ============================================================
-- 13. ARCHIVED TEMPLATES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_templates_archived
ON public.templates(archived_at)
WHERE lifecycle_status = 'archived';


-- ============================================================
-- 14. COMMENTS
-- ============================================================

COMMENT ON TABLE public.templates IS
'Template definitions for the Temple Operations Reporting System. Templates are stored once and referenced by daily_reports.';


COMMENT ON COLUMN public.templates.template_id IS
'Unique template identifier.';


COMMENT ON COLUMN public.templates.template_name IS
'Human-readable template name.';


COMMENT ON COLUMN public.templates.template_code IS
'Optional unique business/template code.';


COMMENT ON COLUMN public.templates.template_type IS
'Template type/category used by the application.';


COMMENT ON COLUMN public.templates.category IS
'Business category of the template.';


COMMENT ON COLUMN public.templates.department IS
'Department associated with the template.';


COMMENT ON COLUMN public.templates.station_keys IS
'Template station definitions. Daily user values are stored separately in daily_reports.stations.';


COMMENT ON COLUMN public.templates.fields IS
'Dynamic field definitions including field types, labels, formulas, validation and dropdown configuration.';


COMMENT ON COLUMN public.templates.metadata IS
'Additional template metadata.';


COMMENT ON COLUMN public.templates.dict_version IS
'Dictionary version used to interpret compact report keys.';


COMMENT ON COLUMN public.templates.version IS
'Immutable template definition version used by reports.';


COMMENT ON COLUMN public.templates.is_active IS
'Whether this template is available for normal report creation.';


COMMENT ON COLUMN public.templates.lifecycle_status IS
'Template lifecycle: active, warning or archived.';


COMMENT ON COLUMN public.templates.last_used_at IS
'Most recent time this template was used by a report.';


COMMENT ON COLUMN public.templates.archived_at IS
'Time when the template was archived.';


COMMENT ON COLUMN public.templates.archive_reason IS
'Reason why the template was archived.';


COMMENT ON COLUMN public.templates.created_by IS
'User who created the template.';


COMMENT ON COLUMN public.templates.created_at IS
'Server creation timestamp.';


COMMENT ON COLUMN public.templates.updated_at IS
'Server modification timestamp.';


-- ============================================================
-- 15. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 15A. ROW LEVEL SECURITY POLICIES
-- ============================================================

DROP POLICY IF EXISTS templates_select_available
ON public.templates;

CREATE POLICY templates_select_available
ON public.templates
FOR SELECT
TO authenticated
USING (
    lifecycle_status IN ('active', 'warning')
    AND is_active = true
);

DROP POLICY IF EXISTS templates_insert_authenticated
ON public.templates;

CREATE POLICY templates_insert_authenticated
ON public.templates
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
);

DROP POLICY IF EXISTS templates_update_owner
ON public.templates;

CREATE POLICY templates_update_owner
ON public.templates
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
)
WITH CHECK (
    created_by = auth.uid()
);



-- ============================================================
-- 16. UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = now();

    RETURN NEW;

END;
$$;


-- ============================================================
-- 17. UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_templates_updated_at
ON public.templates;


CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.set_templates_updated_at();


-- ============================================================
-- 18. MARK UNUSED TEMPLATES
-- ============================================================
--
-- 60 days:
--     active -> warning
--
-- This does NOT delete anything.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_unused_templates(
    warning_days integer DEFAULT 60
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    changed_count bigint;
BEGIN

    IF warning_days < 1 THEN
        RAISE EXCEPTION
            'warning_days must be greater than zero';
    END IF;


    UPDATE public.templates
    SET
        lifecycle_status = 'warning',
        is_active = true
    WHERE lifecycle_status = 'active'
      AND COALESCE(
            last_used_at,
            created_at
          ) < now()
              - make_interval(days => warning_days);


    GET DIAGNOSTICS changed_count = ROW_COUNT;


    RETURN changed_count;

END;
$$;


-- ============================================================
-- 19. ARCHIVE UNUSED TEMPLATES
-- ============================================================
--
-- 65 days:
--     warning -> archived
--
-- IMPORTANT:
--     No physical DELETE.
--
-- Historical daily_reports continue to reference the template.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.archive_unused_templates(
    archive_days integer DEFAULT 65
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    changed_count bigint;
BEGIN

    IF archive_days < 1 THEN
        RAISE EXCEPTION
            'archive_days must be greater than zero';
    END IF;


    UPDATE public.templates
    SET
        lifecycle_status = 'archived',
        is_active = false,
        archived_at = now(),
        archive_reason =
            'Automatically archived after '
            || archive_days
            || ' days without use'
    WHERE lifecycle_status = 'warning'
      AND COALESCE(
            last_used_at,
            created_at
          ) < now()
              - make_interval(days => archive_days);


    GET DIAGNOSTICS changed_count = ROW_COUNT;


    RETURN changed_count;

END;
$$;


-- ============================================================
-- 20. RESTORE ARCHIVED TEMPLATE
-- ============================================================
--
-- If an administrator wants to use an archived template again:
--
-- SELECT public.restore_template('template-uuid');
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.restore_template(
    target_template_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_count integer;
BEGIN

    UPDATE public.templates
    SET
        lifecycle_status = 'active',
        is_active = true,
        archived_at = NULL,
        archive_reason = NULL,
        updated_at = now()
    WHERE template_id = target_template_id
      AND lifecycle_status = 'archived';


    GET DIAGNOSTICS affected_count = ROW_COUNT;


    RETURN affected_count > 0;

END;
$$;


-- ============================================================
-- 21. UPDATE LAST USED
-- ============================================================
--
-- Call this whenever a report is created/updated using a
-- template.
--
-- This is intentionally lightweight.
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_template_usage(
    target_template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    UPDATE public.templates
    SET
        last_used_at = now(),
        lifecycle_status =
            CASE
                WHEN lifecycle_status = 'warning'
                    THEN 'active'
                ELSE lifecycle_status
            END,
        is_active =
            CASE
                WHEN lifecycle_status IN ('active', 'warning')
                    THEN true
                ELSE is_active
            END,
        updated_at = now()
    WHERE template_id = target_template_id
      AND lifecycle_status <> 'archived';

END;
$$;


-- ============================================================
-- 22. FUNCTION COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.mark_unused_templates(integer)
IS
'Marks templates as warning after the configured number of unused days. Default is 60 days.';


COMMENT ON FUNCTION public.archive_unused_templates(integer)
IS
'Archives templates after the configured number of unused days. Default is 65 days. Templates are not physically deleted.';


COMMENT ON FUNCTION public.restore_template(uuid)
IS
'Reactivates an archived template without deleting historical reports.';


COMMENT ON FUNCTION public.touch_template_usage(uuid)
IS
'Updates last_used_at whenever a template is used by the reporting system.';


-- ============================================================

-- ============================================================
-- 22A. UNUSED TEMPLATE WARNING VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.template_usage_warnings
WITH (security_invoker = true)
AS
SELECT
    template_id,
    template_name,
    template_code,
    lifecycle_status,
    is_active,
    last_used_at,
    created_at,
    EXTRACT(
        DAY FROM (
            now() - COALESCE(last_used_at, created_at)
        )
    )::integer AS unused_days
FROM public.templates
WHERE lifecycle_status IN ('warning', 'archived');

-- 23. FINAL
-- ============================================================

COMMIT;
