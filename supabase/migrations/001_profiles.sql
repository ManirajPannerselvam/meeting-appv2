-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 001
-- File Name     : 001_profiles.sql
-- ============================================================
-- PURPOSE
--   Store application user profiles linked to Supabase Auth.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Supabase Auth integration
--   - Soft deactivation instead of deleting profiles
--   - Minimal indexing to reduce storage/write overhead
--
-- DEPENDS ON
--   Supabase Auth (auth.users)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (

    id uuid PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    email text NOT NULL,

    full_name text,

    role text NOT NULL DEFAULT 'Staff',

    department text,

    phone text,

    avatar_url text,

    is_active boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now()

);

-- ============================================================
-- 2. BASIC VALIDATION
-- ============================================================

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_email_not_empty_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_not_empty_check
CHECK (length(trim(email)) > 0);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_not_empty_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_not_empty_check
CHECK (length(trim(role)) > 0);

-- ============================================================
-- 3. ROLE VALIDATION
-- ============================================================
--
-- These values match the roles seeded by the Core Database
-- roles migration.
--
-- If a future role is added, update this constraint in a
-- later migration rather than changing this file manually.
-- ============================================================

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (
    role IN (
        'SuperAdmin',
        'Admin',
        'Manager',
        'Accountant',
        'Staff',
        'Viewer'
    )
);

-- ============================================================
-- 4. EMAIL INDEX
-- ============================================================
--
-- Email should be unique logically, while preserving the
-- original email value supplied by Supabase Auth.
--
-- lower(email) allows case-insensitive lookup.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
ON public.profiles (lower(email));

-- ============================================================
-- 5. ROLE / DEPARTMENT INDEXES
-- ============================================================
--
-- Keep these because administration and authorization queries
-- commonly filter by role and department.
--
-- Do not add indexes for every profile column.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_department
ON public.profiles(department);

-- ============================================================
-- 6. ACTIVE USERS INDEX
-- ============================================================
--
-- Partial index keeps the index smaller because most normal
-- application queries work with active users.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_active
ON public.profiles(id)
WHERE is_active = true;

-- ============================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = now();

    RETURN NEW;

END;
$$;

-- ============================================================
-- 8. UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at
ON public.profiles;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profiles_updated_at();

-- ============================================================
-- 9. COMMENTS
-- ============================================================

COMMENT ON TABLE public.profiles IS
'Application user profiles linked to Supabase Auth users.';

COMMENT ON COLUMN public.profiles.id IS
'Supabase Auth user ID and profile primary key.';

COMMENT ON COLUMN public.profiles.email IS
'User email address synchronized with Supabase Auth.';

COMMENT ON COLUMN public.profiles.full_name IS
'Display name of the application user.';

COMMENT ON COLUMN public.profiles.role IS
'Application role assigned to the user.';

COMMENT ON COLUMN public.profiles.department IS
'Application department assigned to the user.';

COMMENT ON COLUMN public.profiles.phone IS
'Optional user contact phone number.';

COMMENT ON COLUMN public.profiles.avatar_url IS
'Optional profile avatar URL.';

COMMENT ON COLUMN public.profiles.is_active IS
'Controls whether the profile is active without deleting historical ownership data.';

COMMENT ON COLUMN public.profiles.created_at IS
'Server-side timestamp when the profile was created.';

COMMENT ON COLUMN public.profiles.updated_at IS
'Server-side timestamp of the latest profile modification.';

COMMIT;