-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 002
-- File Name     : 002_roles.sql
-- ============================================================
-- PURPOSE
--   Store application roles and their permissions.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - Small, stable role table
--   - JSONB permissions
--   - Minimal storage/index overhead
--   - Safe repeated migration execution
--
-- DEPENDS ON
--   001_profiles.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ROLES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roles (

    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    role_name text NOT NULL,

    description text,

    permissions jsonb NOT NULL DEFAULT '[]'::jsonb,

    created_at timestamptz NOT NULL DEFAULT now()

);

-- ============================================================
-- 2. CONSTRAINTS
-- ============================================================

ALTER TABLE public.roles
DROP CONSTRAINT IF EXISTS roles_role_name_not_empty_check;

ALTER TABLE public.roles
ADD CONSTRAINT roles_role_name_not_empty_check
CHECK (
    length(trim(role_name)) > 0
);

ALTER TABLE public.roles
DROP CONSTRAINT IF EXISTS roles_permissions_array_check;

ALTER TABLE public.roles
ADD CONSTRAINT roles_permissions_array_check
CHECK (
    jsonb_typeof(permissions) = 'array'
);

-- ============================================================
-- 3. CASE-INSENSITIVE ROLE UNIQUENESS
-- ============================================================
--
-- Prevents:
--   Admin
--   admin
--   ADMIN
--
-- from becoming separate roles.
--
-- The index also provides fast role lookup.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_unique
ON public.roles (lower(role_name));

-- ============================================================
-- 4. COMMENTS
-- ============================================================

COMMENT ON TABLE public.roles IS
'Application roles and JSONB permission definitions.';

COMMENT ON COLUMN public.roles.id IS
'Unique application role identifier.';

COMMENT ON COLUMN public.roles.role_name IS
'Unique application role name. Role names are unique case-insensitively.';

COMMENT ON COLUMN public.roles.description IS
'Human-readable description of the role.';

COMMENT ON COLUMN public.roles.permissions IS
'JSONB array containing permissions assigned to the role.';

COMMENT ON COLUMN public.roles.created_at IS
'Server timestamp when the role was created.';

COMMIT;