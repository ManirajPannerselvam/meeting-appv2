-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 006
-- File Name     : 006_system_settings.sql
-- ============================================================
-- PURPOSE
--   Store application-wide configuration/settings.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Small configuration table
--   - JSONB for flexible setting values
--   - Minimal storage/index overhead
--
-- SECURITY
--   - Authenticated users may READ non-sensitive settings.
--   - Admin and SuperAdmin users may INSERT/UPDATE/DELETE.
--   - Normal users cannot modify settings.
--   - Do NOT store secrets in this table.
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SYSTEM SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (

    key text PRIMARY KEY,

    value jsonb NOT NULL DEFAULT '{}'::jsonb,

    updated_at timestamptz NOT NULL DEFAULT now()

);

-- ============================================================
-- 2. VALIDATION
-- ============================================================

ALTER TABLE public.system_settings
DROP CONSTRAINT IF EXISTS system_settings_key_not_empty_check;

ALTER TABLE public.system_settings
ADD CONSTRAINT system_settings_key_not_empty_check
CHECK (
    length(trim(key)) > 0
);

-- Prevent NULL JSONB values.
ALTER TABLE public.system_settings
ALTER COLUMN value SET DEFAULT '{}'::jsonb;

ALTER TABLE public.system_settings
ALTER COLUMN value SET NOT NULL;

-- ============================================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_system_settings_updated_at
ON public.system_settings;

CREATE TRIGGER trg_system_settings_updated_at
BEFORE UPDATE
ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_system_settings_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. READ POLICY
-- ============================================================
--
-- Authenticated users can read application settings.
--
-- IMPORTANT:
-- Do NOT store:
--   - passwords
--   - service-role keys
--   - JWT secrets
--   - private API keys
--   - database credentials
--   - other confidential secrets
--
-- If confidential settings are required later, create a
-- separate protected table instead.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view system settings"
ON public.system_settings;

CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
    true
);

-- ============================================================
-- 7. ADMIN INSERT POLICY
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert system settings"
ON public.system_settings;

CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(trim(p.role)) IN ('admin', 'superadmin')
    )
);

-- ============================================================
-- 8. ADMIN UPDATE POLICY
-- ============================================================

DROP POLICY IF EXISTS "Admins can update system settings"
ON public.system_settings;

CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(trim(p.role)) IN ('admin', 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(trim(p.role)) IN ('admin', 'superadmin')
    )
);

-- ============================================================
-- 9. ADMIN DELETE POLICY
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete system settings"
ON public.system_settings;

CREATE POLICY "Admins can delete system settings"
ON public.system_settings
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(trim(p.role)) IN ('admin', 'superadmin')
    )
);

-- ============================================================
-- 10. COMMENTS
-- ============================================================

COMMENT ON TABLE public.system_settings IS
'Application-wide configuration values stored as JSONB. Secrets must not be stored here.';

COMMENT ON COLUMN public.system_settings.key IS
'Unique application setting key.';

COMMENT ON COLUMN public.system_settings.value IS
'Flexible JSONB application configuration value. Must not contain confidential secrets.';

COMMENT ON COLUMN public.system_settings.updated_at IS
'Server-side timestamp of the latest setting modification.';

COMMENT ON FUNCTION public.set_system_settings_updated_at()
IS
'Automatically updates system_settings.updated_at before modifications.';

COMMIT;