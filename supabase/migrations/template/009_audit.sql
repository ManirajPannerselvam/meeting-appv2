-- ============================================================
-- Temple Operations Reporting System
-- Database      : Template Database
-- Migration No. : 009
-- File Name     : 009_audit.sql
-- ============================================================
-- PURPOSE
--   Compact audit logging for templates and daily_reports.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent online users
--   - Offline synchronization
--   - Long-term storage
--   - Low audit storage overhead
--
-- STORAGE DESIGN
--   - One audit row per INSERT / UPDATE / DELETE.
--   - INSERT/DELETE store the affected row snapshot.
--   - UPDATE stores only changed columns.
--   - UPDATE does not create a separate full-row snapshot.
--   - Actor is taken from auth.uid().
--
-- SECURITY
--   - Audit trigger function is SECURITY DEFINER.
--   - search_path is fixed.
--   - Normal users cannot directly insert arbitrary audit records.
--   - Audit rows remain protected by RLS for reading.
--
-- RETENTION
--   - Default retention: 180 days.
--   - Minimum allowed retention: 30 days.
--   - Cleanup is explicitly executed by an administrator/job.
--
-- IMPORTANT
--   This migration expects public.audit_logs to use the compact
--   schema defined below.
--
--   If an older audit_logs table already exists with columns such
--   as user_id/action/module/old_data/new_data, DO NOT DROP IT.
--   Create a separate migration to migrate that existing data first.
--
-- DEPENDS ON
--   001_extensions.sql
--   002_templates.sql
--   003_daily_reports.sql
--   004_indexes.sql
--   005_rls.sql
--   006_triggers.sql
--   007_rpc.sql
--   008_views.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (

    id bigint
        GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    table_name text NOT NULL,

    operation text NOT NULL,

    record_key jsonb NOT NULL
        DEFAULT '{}'::jsonb,

    changed_data jsonb NOT NULL
        DEFAULT '{}'::jsonb,

    changed_by uuid,

    changed_at timestamptz NOT NULL
        DEFAULT now()
);

-- ============================================================
-- 2. CONSTRAINTS
-- ============================================================

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_operation_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_operation_check
CHECK (
    operation IN (
        'INSERT',
        'UPDATE',
        'DELETE'
    )
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_table_name_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_table_name_check
CHECK (
    table_name IN (
        'templates',
        'daily_reports'
    )
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_record_key_object_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_record_key_object_check
CHECK (
    jsonb_typeof(record_key) = 'object'
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_changed_data_object_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_changed_data_object_check
CHECK (
    jsonb_typeof(changed_data) = 'object'
);

-- ============================================================
-- 3. ENABLE RLS
-- ============================================================

ALTER TABLE public.audit_logs
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. AUDIT READ POLICY
-- ============================================================
--
-- Regular users do not automatically receive access to the
-- complete audit history.
--
-- Administrative access should be controlled through the
-- application's admin role / authorization layer.
--
-- The service role can bypass RLS.
-- ============================================================

DROP POLICY IF EXISTS "Admins can view audit logs"
ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND lower(p.role) IN (
              'admin',
              'superadmin'
          )
    )
);

-- ============================================================
-- 5. AUDIT INDEXES
-- ============================================================
--
-- Keep indexes deliberately small.
--
-- DO NOT create a GIN index on changed_data.
-- JSONB audit data can become large and highly variable.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at
ON public.audit_logs (
    changed_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_changed_at
ON public.audit_logs (
    table_name,
    changed_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by
ON public.audit_logs (
    changed_by,
    changed_at DESC
);

-- ============================================================
-- 6. COMPACT AUDIT TRIGGER FUNCTION
-- ============================================================
--
-- SECURITY DEFINER is intentional.
--
-- The application user may update templates/daily_reports but
-- should not need direct INSERT permission on audit_logs.
--
-- The function writes the audit record using its owner's
-- privileges while auth.uid() still identifies the real actor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_actor uuid;

    v_record_key jsonb;
    v_changed_data jsonb;

    v_old jsonb;
    v_new jsonb;

    v_key text;

    v_old_value jsonb;
    v_new_value jsonb;

    v_diff jsonb := '{}'::jsonb;

BEGIN

    -- --------------------------------------------------------
    -- Identify authenticated actor.
    -- --------------------------------------------------------

    v_actor := auth.uid();

    -- --------------------------------------------------------
    -- TEMPLATES
    -- --------------------------------------------------------

    IF TG_TABLE_NAME = 'templates' THEN

        -- INSERT
        IF TG_OP = 'INSERT' THEN

            v_record_key := jsonb_build_object(
                'template_id',
                NEW.template_id
            );

            v_changed_data := to_jsonb(NEW);

        -- DELETE
        ELSIF TG_OP = 'DELETE' THEN

            v_record_key := jsonb_build_object(
                'template_id',
                OLD.template_id
            );

            v_changed_data := to_jsonb(OLD);

        -- UPDATE
        ELSE

            v_record_key := jsonb_build_object(
                'template_id',
                NEW.template_id
            );

            v_old := to_jsonb(OLD);
            v_new := to_jsonb(NEW);

            FOR v_key IN
                SELECT key
                FROM jsonb_object_keys(v_new) AS key
            LOOP

                v_old_value := v_old -> v_key;
                v_new_value := v_new -> v_key;

                IF v_old_value IS DISTINCT FROM v_new_value THEN

                    v_diff :=
                        v_diff ||
                        jsonb_build_object(
                            v_key,
                            jsonb_build_object(
                                'old', v_old_value,
                                'new', v_new_value
                            )
                        );

                END IF;

            END LOOP;

            v_changed_data := v_diff;

        END IF;

    -- --------------------------------------------------------
    -- DAILY REPORTS
    -- --------------------------------------------------------

    ELSIF TG_TABLE_NAME = 'daily_reports' THEN

        -- INSERT
        IF TG_OP = 'INSERT' THEN

            v_record_key := jsonb_build_object(
                'report_date', NEW.report_date,
                'shift', NEW.shift,
                'template_id', NEW.template_id,
                'user_id', NEW.user_id
            );

            v_changed_data := to_jsonb(NEW);

        -- DELETE
        ELSIF TG_OP = 'DELETE' THEN

            v_record_key := jsonb_build_object(
                'report_date', OLD.report_date,
                'shift', OLD.shift,
                'template_id', OLD.template_id,
                'user_id', OLD.user_id
            );

            v_changed_data := to_jsonb(OLD);

        -- UPDATE
        ELSE

            v_record_key := jsonb_build_object(
                'report_date', NEW.report_date,
                'shift', NEW.shift,
                'template_id', NEW.template_id,
                'user_id', NEW.user_id
            );

            v_old := to_jsonb(OLD);
            v_new := to_jsonb(NEW);

            FOR v_key IN
                SELECT key
                FROM jsonb_object_keys(v_new) AS key
            LOOP

                v_old_value := v_old -> v_key;
                v_new_value := v_new -> v_key;

                IF v_old_value IS DISTINCT FROM v_new_value THEN

                    v_diff :=
                        v_diff ||
                        jsonb_build_object(
                            v_key,
                            jsonb_build_object(
                                'old', v_old_value,
                                'new', v_new_value
                            )
                        );

                END IF;

            END LOOP;

            v_changed_data := v_diff;

        END IF;

    ELSE

        RAISE EXCEPTION
            'Audit trigger is not configured for table %',
            TG_TABLE_NAME;

    END IF;

    -- --------------------------------------------------------
    -- Write audit event.
    -- --------------------------------------------------------

    INSERT INTO public.audit_logs (
        table_name,
        operation,
        record_key,
        changed_data,
        changed_by,
        changed_at
    )
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(
            v_record_key,
            '{}'::jsonb
        ),
        COALESCE(
            v_changed_data,
            '{}'::jsonb
        ),
        v_actor,
        now()
    );

    -- --------------------------------------------------------
    -- Trigger return value.
    -- --------------------------------------------------------

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;

END;
$$;

-- ============================================================
-- 7. FUNCTION SECURITY
-- ============================================================
--
-- Do not allow normal authenticated users to execute the
-- audit function manually.
--
-- PostgreSQL triggers can still execute the function.
-- ============================================================

REVOKE ALL
ON FUNCTION public.audit_application_change()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.audit_application_change()
FROM authenticated;

REVOKE ALL
ON FUNCTION public.audit_application_change()
FROM anon;

-- ============================================================
-- 8. TEMPLATES AUDIT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_templates_audit
ON public.templates;

CREATE TRIGGER trg_templates_audit

AFTER INSERT OR UPDATE OR DELETE

ON public.templates

FOR EACH ROW

EXECUTE FUNCTION public.audit_application_change();

-- ============================================================
-- 9. DAILY REPORTS AUDIT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_daily_reports_audit
ON public.daily_reports;

CREATE TRIGGER trg_daily_reports_audit

AFTER INSERT OR UPDATE OR DELETE

ON public.daily_reports

FOR EACH ROW

EXECUTE FUNCTION public.audit_application_change();

-- ============================================================
-- 10. AUDIT RETENTION FUNCTION
-- ============================================================
--
-- Default retention:
--   180 days
--
-- Minimum:
--   30 days
--
-- The function intentionally does not run automatically during
-- normal application traffic.
--
-- Schedule it separately through an administrative scheduler.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_audit_logs(
    p_retention_days integer DEFAULT 180
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

    v_deleted bigint;

BEGIN

    IF p_retention_days IS NULL THEN
        p_retention_days := 180;
    END IF;

    IF p_retention_days < 30 THEN

        RAISE EXCEPTION
            'Audit retention cannot be less than 30 days';

    END IF;

    DELETE FROM public.audit_logs

    WHERE changed_at <
        now() -
        make_interval(
            days => p_retention_days
        );

    GET DIAGNOSTICS
        v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;
$$;

-- ============================================================
-- 11. RETENTION FUNCTION SECURITY
-- ============================================================

REVOKE ALL
ON FUNCTION public.cleanup_audit_logs(integer)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.cleanup_audit_logs(integer)
FROM authenticated;

REVOKE ALL
ON FUNCTION public.cleanup_audit_logs(integer)
FROM anon;

-- ============================================================
-- 12. COMMENTS
-- ============================================================

COMMENT ON TABLE public.audit_logs IS
'Compact audit history for templates and daily_reports. UPDATE events contain only changed columns.';

COMMENT ON COLUMN public.audit_logs.table_name IS
'Application table that generated the audit event.';

COMMENT ON COLUMN public.audit_logs.operation IS
'INSERT, UPDATE or DELETE operation.';

COMMENT ON COLUMN public.audit_logs.record_key IS
'Compact JSONB identifier of the affected record.';

COMMENT ON COLUMN public.audit_logs.changed_data IS
'INSERT/DELETE snapshot or UPDATE old/new values for changed columns.';

COMMENT ON COLUMN public.audit_logs.changed_by IS
'Authenticated user responsible for the operation.';

COMMENT ON COLUMN public.audit_logs.changed_at IS
'Server timestamp when the audit event was recorded.';

COMMENT ON FUNCTION public.audit_application_change()
IS
'SECURITY DEFINER compact audit trigger for templates and daily_reports.';

COMMENT ON FUNCTION public.cleanup_audit_logs(integer)
IS
'Deletes audit events older than the requested retention period; minimum 30 days.';

COMMIT;