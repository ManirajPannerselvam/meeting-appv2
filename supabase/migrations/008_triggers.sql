-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 008
-- File Name     : 008_triggers.sql
-- ============================================================
-- PURPOSE
--   Create database triggers for timestamp maintenance and
--   automatic profile creation after Supabase Auth signup.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Safe repeated migration execution
--   - Supabase Auth integration
-- ============================================================

BEGIN;

-- ============================================================
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============================================================
-- 2. PROFILES UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_updated
ON public.profiles;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. SYSTEM SETTINGS UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_system_settings_updated
ON public.system_settings;

CREATE TRIGGER trg_system_settings_updated
BEFORE UPDATE
ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. CREATE PROFILE AFTER SUPABASE AUTH SIGNUP
-- ============================================================
--
-- Creates the application profile automatically whenever a
-- new Supabase Auth user is created.
--
-- SECURITY DEFINER is required because auth.users is managed
-- by Supabase Auth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            ''
        ),
        'Staff'
    )
    ON CONFLICT (id)
    DO NOTHING;

    RETURN NEW;

END;
$$;

-- ============================================================
-- 5. SUPABASE AUTH USER TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. FUNCTION COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.update_updated_at()
IS
'Automatically updates updated_at before a row is modified.';

COMMENT ON FUNCTION public.handle_new_user()
IS
'Creates an application profile after a Supabase Auth user is created.';

COMMIT;