-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 007
-- File Name     : 007_rls_policies.sql
-- ============================================================
-- PURPOSE
--   Configure Row Level Security for core application tables.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - User-owned data protection
--   - Role-based administrative access
--   - Append-oriented audit history
--   - Safe repeated execution
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
--   003_audit_logs.sql
--   004_finance_transactions.sql
--   005_notifications.sql
--   006_system_settings.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENABLE RLS
-- ============================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.finance_transactions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system_settings
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. HELPER: ADMIN CHECK
-- ============================================================
-- Recognizes both seeded administrative roles:
--   Admin
--   SuperAdmin
--
-- IMPORTANT:
-- This function is SECURITY INVOKER so the caller's normal
-- permissions/RLS context remains in effect.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
-- 3. PROFILES
-- ============================================================
-- Users can read and update only their own profile.
--
-- Administrative profile management can be added later through
-- dedicated admin RPC functions rather than exposing unrestricted
-- table writes.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile"
ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);


DROP POLICY IF EXISTS "Users can update own profile"
ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- ============================================================
-- 4. ROLES
-- ============================================================
-- Role definitions are readable by authenticated users.
--
-- INSERT / UPDATE / DELETE are intentionally not exposed to
-- normal authenticated users.
-- Administrative role management should use a controlled
-- server-side operation or secure RPC.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view roles"
ON public.roles;

CREATE POLICY "Authenticated users can view roles"
ON public.roles
FOR SELECT
TO authenticated
USING (
    true
);


-- ============================================================
-- 5. AUDIT LOGS
-- ============================================================
-- Audit logs are append-oriented.
--
-- Normal users:
--   Can view their own audit entries.
--
-- Admin / SuperAdmin:
--   Can view all audit entries.
--
-- Inserts:
--   User may create an entry for themselves.
--   NULL user_id is allowed for system-level entries.
--
-- No UPDATE / DELETE policies are created.
-- ============================================================

DROP POLICY IF EXISTS "Users view own audit logs"
ON public.audit_logs;

CREATE POLICY "Users view own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);


DROP POLICY IF EXISTS "Admins can view all audit logs"
ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    public.is_admin_user()
);


DROP POLICY IF EXISTS "Authenticated users can create audit logs"
ON public.audit_logs;

CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
);


-- ============================================================
-- 6. FINANCE TRANSACTIONS
-- ============================================================
-- Finance information is sensitive.
--
-- Accountant:
--   Read finance records.
--
-- Manager:
--   Read finance records.
--
-- Admin / SuperAdmin:
--   Full finance access.
--
-- Staff / Viewer:
--   No direct finance access.
--
-- Users may create/update/delete only records they own,
-- provided their role is authorized for finance.
-- ============================================================

DROP POLICY IF EXISTS "Authorized users read finance"
ON public.finance_transactions;

CREATE POLICY "Authorized users read finance"
ON public.finance_transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant',
              'manager'
          )
    )
);


DROP POLICY IF EXISTS "Authorized users insert finance"
ON public.finance_transactions;

CREATE POLICY "Authorized users insert finance"
ON public.finance_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant'
          )
    )
);


DROP POLICY IF EXISTS "Finance owners update finance"
ON public.finance_transactions;

CREATE POLICY "Finance owners update finance"
ON public.finance_transactions
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant'
          )
    )
)
WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant'
          )
    )
);


DROP POLICY IF EXISTS "Finance owners delete finance"
ON public.finance_transactions;

CREATE POLICY "Finance owners delete finance"
ON public.finance_transactions
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN (
              'admin',
              'superadmin',
              'accountant'
          )
    )
);


-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
-- Users can:
--   SELECT their own notifications
--   UPDATE their own notifications
--   DELETE their own notifications
--
-- INSERT is intentionally NOT granted to normal users.
-- Notifications should normally be generated by application
-- server-side logic or trusted RPC functions.
-- ============================================================

DROP POLICY IF EXISTS "Users view own notifications"
ON public.notifications;

CREATE POLICY "Users view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);


DROP POLICY IF EXISTS "Users update own notifications"
ON public.notifications;

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);


DROP POLICY IF EXISTS "Users delete own notifications"
ON public.notifications;

CREATE POLICY "Users delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);


-- ============================================================
-- 8. SYSTEM SETTINGS
-- ============================================================
-- All authenticated users can read application settings.
--
-- Only active Admin / SuperAdmin users can modify settings.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users read settings"
ON public.system_settings;

CREATE POLICY "Authenticated users read settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
    true
);


DROP POLICY IF EXISTS "Admins manage system settings"
ON public.system_settings;

CREATE POLICY "Admins manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (
    public.is_admin_user()
)
WITH CHECK (
    public.is_admin_user()
);


-- ============================================================
-- 9. EXPLICIT APPEND-ONLY PROTECTION
-- ============================================================
-- No UPDATE or DELETE policies are created for audit_logs.
--
-- Therefore normal authenticated users cannot modify or delete
-- existing audit history through the PostgREST client.
-- ============================================================


-- ============================================================
-- 10. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.is_admin_user()
IS
'Returns true for active Admin and SuperAdmin application users.';


COMMENT ON TABLE public.profiles IS
'RLS enabled. Users can access and update only their own profile.';


COMMENT ON TABLE public.roles IS
'RLS enabled. Authenticated users can read role definitions.';


COMMENT ON TABLE public.audit_logs IS
'RLS enabled. Users can view their own audit history; Admin and SuperAdmin users can view all audit history.';


COMMENT ON TABLE public.finance_transactions IS
'RLS enabled. Finance access is restricted to authorized financial and administrative roles.';


COMMENT ON TABLE public.notifications IS
'RLS enabled. Notifications are accessible only to their intended recipient.';


COMMENT ON TABLE public.system_settings IS
'RLS enabled. Settings are readable by authenticated users and writable only by active administrators.';


COMMIT;