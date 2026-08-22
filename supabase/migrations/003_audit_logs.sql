-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 003
-- File Name     : 003_audit_logs.sql
-- ============================================================
-- PURPOSE
--   Store application-level audit history.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Append-oriented audit history
--   - Low index/storage overhead
--   - Controlled retention/archival
--
-- SECURITY
--   - RLS enabled
--   - Admins can read all audit records
--   - Users can read only their own audit records
--   - Normal authenticated clients cannot directly insert,
--     update or delete audit records
--   - Trusted SECURITY DEFINER functions/triggers may insert
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (

    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    action text NOT NULL,

    module text NOT NULL,

    record_id text,

    description text,

    old_data jsonb,

    new_data jsonb,

    ip_address text,

    user_agent text,

    created_at timestamptz NOT NULL DEFAULT now()

);

-- ============================================================
-- 2. BASIC VALIDATION
-- ============================================================

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_action_not_empty_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_action_not_empty_check
CHECK (
    length(trim(action)) > 0
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_module_not_empty_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_module_not_empty_check
CHECK (
    length(trim(module)) > 0
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_old_data_object_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_old_data_object_check
CHECK (
    old_data IS NULL
    OR jsonb_typeof(old_data) = 'object'
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_new_data_object_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_new_data_object_check
CHECK (
    new_data IS NULL
    OR jsonb_typeof(new_data) = 'object'
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
--
-- Audit tables can become very large.
--
-- Keep indexes limited to actual access patterns:
--
--   1. User audit history
--   2. Latest audit records
--   3. Module history
--
-- Do NOT index:
--   old_data
--   new_data
--   description
--   user_agent
--   ip_address
--
-- unless production query analysis proves it necessary.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
ON public.audit_logs (
    user_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON public.audit_logs (
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created
ON public.audit_logs (
    module,
    created_at DESC
);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.audit_logs
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. ADMIN READ POLICY
-- ============================================================
--
-- Application roles:
--
--   SuperAdmin
--   Admin
--   Manager
--   Accountant
--   Staff
--   Viewer
--
-- Only SuperAdmin and Admin receive full audit visibility.
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all audit logs"
ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND lower(p.role) IN ('superadmin', 'admin')
    )
);

-- ============================================================
-- 6. USER READ POLICY
-- ============================================================
--
-- Normal users can inspect their own audit history.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own audit logs"
ON public.audit_logs;

CREATE POLICY "Users can view own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 7. NO DIRECT CLIENT INSERT
-- ============================================================
--
-- Intentionally NO INSERT policy is created for authenticated
-- users.
--
-- This prevents a client from doing:
--
--   INSERT INTO audit_logs (...)
--
-- and creating false audit history.
--
-- Trusted server-side SECURITY DEFINER functions/triggers can
-- insert audit records when required.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create audit logs"
ON public.audit_logs;

DROP POLICY IF EXISTS "System inserts audit logs"
ON public.audit_logs;

-- ============================================================
-- 8. NO UPDATE / DELETE POLICY
-- ============================================================
--
-- Audit history is append-oriented and immutable to normal
-- application users.
--
-- No UPDATE or DELETE policy is created.
--
-- Retention cleanup must be performed by a trusted server-side
-- administrative process.
-- ============================================================

-- ============================================================
-- 9. COMMENTS
-- ============================================================

COMMENT ON TABLE public.audit_logs IS
'Append-oriented application audit history with restricted client access.';

COMMENT ON COLUMN public.audit_logs.user_id IS
'Application user responsible for the audited action. NULL may represent a system-level action.';

COMMENT ON COLUMN public.audit_logs.action IS
'Action performed, such as INSERT, UPDATE, DELETE, LOGIN, APPROVE or REJECT.';

COMMENT ON COLUMN public.audit_logs.module IS
'Application module where the action occurred.';

COMMENT ON COLUMN public.audit_logs.record_id IS
'Identifier of the affected application record, stored as text to support UUID, bigint and other identifiers.';

COMMENT ON COLUMN public.audit_logs.description IS
'Human-readable description of the audited operation.';

COMMENT ON COLUMN public.audit_logs.old_data IS
'Previous record state when applicable. Avoid storing unnecessary sensitive data.';

COMMENT ON COLUMN public.audit_logs.new_data IS
'New record state when applicable. Avoid storing unnecessary sensitive data.';

COMMENT ON COLUMN public.audit_logs.ip_address IS
'Optional source IP associated with the audited operation.';

COMMENT ON COLUMN public.audit_logs.user_agent IS
'Optional client user-agent associated with the audited operation.';

COMMENT ON COLUMN public.audit_logs.created_at IS
'Server timestamp when the audit event was recorded.';

COMMIT;