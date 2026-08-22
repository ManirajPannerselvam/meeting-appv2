-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 010
-- File Name     : 010_seed.sql
-- ============================================================
-- PURPOSE
--   Idempotent seed data for initial application operation.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - Minimal initial storage
--   - No demo/test report rows
--   - One shared system template
--   - Safe to execute repeatedly
--
-- IMPORTANT
--   - No schema changes.
--   - No daily_reports rows are seeded.
--   - No duplicate template is created per user/station.
--   - SYSTEM_DEFAULT is created only when it does not exist.
--   - Existing production template data is never overwritten.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DICTIONARY VERSION / DEFAULT TEMPLATE
-- ============================================================
--
-- Keep dict_version synchronized with the application's
-- dict.json compression dictionary.
--
-- The default template is intentionally minimal.
-- Production template designers can later customize or clone it.
-- ============================================================

INSERT INTO public.templates (
    template_name,
    template_code,
    template_type,
    category,
    department,
    description,
    station_keys,
    fields,
    metadata,
    dict_version,
    version,
    is_active
)
SELECT
    'Default Operations Template',
    'SYSTEM_DEFAULT',
    'daily_operations',
    'System',
    'Operations',
    'Base template for initial application setup. Customize or clone this template before production use.',
    '{}'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
        'seeded', true,
        'seed_version', 1,
        'dictionary_version', 1
    ),
    1,
    1,
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM public.templates
    WHERE template_code = 'SYSTEM_DEFAULT'
);

-- ============================================================
-- 2. DEFAULT TEMPLATE RULE
-- ============================================================
--
-- Do not create a template for every:
--   - user
--   - station
--   - temple
--   - daily report
--
-- One template definition can be reused by many reports.
--
-- This is important for storage efficiency.
-- ============================================================

-- No additional data required.

-- ============================================================
-- 3. SAMPLE STATIONS
-- ============================================================
--
-- No production stations are inserted here.
--
-- Station definitions belong inside template.station_keys.
--
-- Example:
--
-- {
--   "S01": {
--     "name": "Station 01"
--   },
--   "S02": {
--     "name": "Station 02"
--   }
-- }
--
-- Do not create separate station tables unless the application
-- requirements later require relational station management.
-- ============================================================

-- Intentionally empty.

-- ============================================================
-- 4. SAMPLE FIELDS
-- ============================================================
--
-- No sample fields are inserted into the production template.
--
-- Fields are maintained by the template designer.
--
-- Example:
--
-- [
--   {
--     "key": "qty",
--     "label": "Quantity",
--     "type": "number"
--   },
--   {
--     "key": "remark",
--     "label": "Remarks",
--     "type": "text"
--   }
-- ]
-- ============================================================

-- Intentionally empty.

-- ============================================================
-- 5. APPLICATION SETTINGS
-- ============================================================
--
-- The current template database schema does not contain a
-- system_settings table.
--
-- Therefore settings are NOT inserted here.
--
-- system_settings belongs to the application/system database
-- migration set.
-- ============================================================

-- Intentionally empty.

-- ============================================================
-- 6. DEVELOPMENT / TEST DATA
-- ============================================================
--
-- NEVER seed:
--   - fake users
--   - fake profiles
--   - fake daily reports
--   - fake finance transactions
--   - fake notifications
--   - fake audit logs
--
-- This keeps production storage clean.
-- ============================================================

-- Intentionally empty.

-- ============================================================
-- 7. SEED VERIFICATION
-- ============================================================

DO $$
DECLARE
    v_template_count integer;
    v_dictionary_version integer;
BEGIN

    SELECT count(*)
    INTO v_template_count
    FROM public.templates
    WHERE template_code = 'SYSTEM_DEFAULT';

    IF v_template_count <> 1 THEN

        RAISE EXCEPTION
            '010_seed verification failed: expected exactly one SYSTEM_DEFAULT template, found %',
            v_template_count;

    END IF;

    SELECT dict_version
    INTO v_dictionary_version
    FROM public.templates
    WHERE template_code = 'SYSTEM_DEFAULT'
    LIMIT 1;

    IF v_dictionary_version IS NULL THEN

        RAISE EXCEPTION
            '010_seed verification failed: SYSTEM_DEFAULT dictionary version is NULL';

    END IF;

END $$;

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON TABLE public.templates IS
'Template definitions for the Temple Operations Reporting System.';

COMMENT ON COLUMN public.templates.metadata IS
'Additional template metadata. SYSTEM_DEFAULT seed metadata includes seeded=true, seed_version and dictionary_version.';

-- ============================================================
-- 9. FINAL SEED SUMMARY
-- ============================================================
--
-- Created:
--   1 shared SYSTEM_DEFAULT template if missing.
--
-- Not created:
--   stations
--   fields
--   users
--   reports
--   audit records
--   finance records
--   notifications
--   system settings
--
-- This keeps the initial database footprint small.
-- ============================================================

COMMIT;