-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 005
-- File Name     : 005_rls.sql
-- ============================================================
-- PURPOSE
--   Configure Row Level Security for template definitions and
--   user-owned daily reports.
--
-- SECURITY MODEL
--   templates:
--     - authenticated users can read active/warning templates
--     - users can create/update templates they own
--     - users can archive/delete only templates they own
--
--   daily_reports:
--     - users can access only their own reports
--     - users can insert/update/delete only their own reports
--
--   service_role:
--     - Supabase service_role bypasses RLS automatically.
--     - No redundant service-role policies are created.
--
-- IMPORTANT
--   This migration intentionally does NOT assume an admin-role,
--   department-role, temple-role, or station-role schema because
--   those authorization columns/tables were not supplied.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Force RLS for table-owner sessions as well. This prevents a
-- normal table owner connection from accidentally bypassing the
-- policies. Supabase service_role remains able to operate through
-- its elevated role.
ALTER TABLE public.templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 2. TEMPLATES POLICIES
-- ============================================================

DROP POLICY IF EXISTS templates_select_authenticated
ON public.templates;

CREATE POLICY templates_select_authenticated
ON public.templates
FOR SELECT
TO authenticated
USING (
    is_active = true
    AND lifecycle_status IN ('active', 'warning')
);

DROP POLICY IF EXISTS templates_insert_owner
ON public.templates;

CREATE POLICY templates_insert_owner
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

DROP POLICY IF EXISTS templates_delete_owner
ON public.templates;

CREATE POLICY templates_delete_owner
ON public.templates
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- ============================================================
-- 3. DAILY REPORT POLICIES
-- ============================================================

DROP POLICY IF EXISTS daily_reports_select_owner
ON public.daily_reports;

CREATE POLICY daily_reports_select_owner
ON public.daily_reports
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS daily_reports_insert_owner
ON public.daily_reports;

CREATE POLICY daily_reports_insert_owner
ON public.daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS daily_reports_update_owner
ON public.daily_reports;

CREATE POLICY daily_reports_update_owner
ON public.daily_reports
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS daily_reports_delete_owner
ON public.daily_reports;

CREATE POLICY daily_reports_delete_owner
ON public.daily_reports
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 4. SERVICE ROLE
-- ============================================================
--
-- Supabase's service_role is designed to bypass RLS.
-- Creating a policy such as:
--   TO service_role USING (true)
-- is unnecessary and weakens the clarity of the security model.
--
-- Therefore no service-role policy is created here.
-- ============================================================

-- ============================================================
-- 5. COMMENTS
-- ============================================================

COMMENT ON POLICY templates_select_authenticated
ON public.templates
IS 'Authenticated users may read active and warning templates.';

COMMENT ON POLICY templates_insert_owner
ON public.templates
IS 'Users may create templates only when created_by matches auth.uid().';

COMMENT ON POLICY templates_update_owner
ON public.templates
IS 'Users may update only templates they own.';

COMMENT ON POLICY templates_delete_owner
ON public.templates
IS 'Users may delete only templates they own.';

COMMENT ON POLICY daily_reports_select_owner
ON public.daily_reports
IS 'Users may read only their own daily reports.';

COMMENT ON POLICY daily_reports_insert_owner
ON public.daily_reports
IS 'Users may insert reports only for their own auth user ID.';

COMMENT ON POLICY daily_reports_update_owner
ON public.daily_reports
IS 'Users may update only their own daily reports.';

COMMENT ON POLICY daily_reports_delete_owner
ON public.daily_reports
IS 'Users may delete only their own daily reports.';

COMMIT;
