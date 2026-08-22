-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 015
-- File Name     : 015_permissions.sql
-- ============================================================
-- PURPOSE
--   Centralized permission helpers for application authorization.
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
--   007_rls_policies.sql
--   010_rpc.sql
--   012_indexes.sql
--   013_validation.sql
--   014_views.sql
--
-- DESIGN
--   - Uses profiles.role -> roles.role_name
--   - Uses roles.permissions JSONB
--   - Keeps authorization logic centralized
--   - Does NOT replace Row Level Security
--   - Safe to execute repeatedly
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CHECK CURRENT USER ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT p.role
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
    LIMIT 1;
$$;

-- ============================================================
-- 2. CHECK ROLE PERMISSION
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permission(
    p_permission text
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.roles r
          ON lower(r.role_name) = lower(p.role)
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND (
              r.permissions @> '["*"]'::jsonb
              OR r.permissions @> jsonb_build_array(p_permission)
          )
    );
$$;

-- ============================================================
-- 3. CHECK MULTIPLE PERMISSIONS
-- ============================================================
-- Returns true when the current user has every requested
-- permission.

CREATE OR REPLACE FUNCTION public.has_all_permissions(
    p_permissions jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        jsonb_typeof(p_permissions) = 'array'
        AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(p_permissions) AS requested(permission)
            WHERE NOT public.has_permission(requested.permission)
        );
$$;

-- ============================================================
-- 4. CHECK ANY PERMISSION
-- ============================================================
-- Returns true when the current user has at least one of the
-- requested permissions.

CREATE OR REPLACE FUNCTION public.has_any_permission(
    p_permissions jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        jsonb_typeof(p_permissions) = 'array'
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(p_permissions) AS requested(permission)
            WHERE public.has_permission(requested.permission)
        );
$$;

-- ============================================================
-- 5. CHECK CURRENT USER ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(
    p_role text
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) = lower(p_role)
    );
$$;

-- ============================================================
-- 6. ADMIN CHECK
-- ============================================================
-- SuperAdmin and Admin are treated as administrative roles.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN ('admin', 'superadmin')
    );
$$;

-- ============================================================
-- 7. GET CURRENT USER PERMISSIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(
        r.permissions,
        '[]'::jsonb
    )
    FROM public.profiles p
    LEFT JOIN public.roles r
      ON lower(r.role_name) = lower(p.role)
    WHERE p.id = auth.uid()
      AND p.is_active = true
    LIMIT 1;
$$;

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.get_my_role()
IS
'Returns the authenticated active users application role.';

COMMENT ON FUNCTION public.has_permission(text)
IS
'Checks whether the authenticated user has a specific application permission.';

COMMENT ON FUNCTION public.has_all_permissions(jsonb)
IS
'Checks whether the authenticated user has every permission in the supplied JSONB array.';

COMMENT ON FUNCTION public.has_any_permission(jsonb)
IS
'Checks whether the authenticated user has at least one permission in the supplied JSONB array.';

COMMENT ON FUNCTION public.has_role(text)
IS
'Checks whether the authenticated user has the supplied application role.';

COMMENT ON FUNCTION public.is_admin()
IS
'Returns true for active Admin or SuperAdmin users.';

COMMENT ON FUNCTION public.get_my_permissions()
IS
'Returns the authenticated users JSONB permission list.';

COMMIT;