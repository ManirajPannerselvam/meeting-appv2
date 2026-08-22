-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 013
-- File Name     : 013_validation.sql
-- ============================================================
-- PURPOSE
--   Add database-level validation constraints for core tables.
--
-- DESIGN TARGET
--   - Protect data integrity at database level
--   - Prevent invalid status/type values
--   - Prevent invalid financial values
--   - Keep validation lightweight and index-free
--   - Safe repeated execution
--
-- DEPENDS ON
--   001_profiles.sql
--   002_roles.sql
--   003_audit_logs.sql
--   004_finance_transactions.sql
--   005_notifications.sql
--   006_system_settings.sql
--   007_rls_policies.sql
--   008_triggers.sql
--   009_seed_data.sql
--   010_rpc.sql
--   012_indexes.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROFILES VALIDATION
-- ============================================================

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_email_not_empty_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_not_empty_check
CHECK (
    length(trim(email)) > 0
);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_not_empty_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_not_empty_check
CHECK (
    length(trim(role)) > 0
);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_department_not_empty_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_department_not_empty_check
CHECK (
    department IS NULL
    OR length(trim(department)) > 0
);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_phone_not_empty_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_not_empty_check
CHECK (
    phone IS NULL
    OR length(trim(phone)) > 0
);

-- ============================================================
-- 2. ROLES VALIDATION
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
-- 3. FINANCE VALIDATION
-- ============================================================

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_type_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_type_not_empty_check
CHECK (
    length(trim(transaction_type)) > 0
);

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_category_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_category_not_empty_check
CHECK (
    length(trim(category)) > 0
);

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_amount_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_amount_check
CHECK (
    amount <> 0
);

ALTER TABLE public.finance_transactions
DROP CONSTRAINT IF EXISTS finance_transactions_reference_not_empty_check;

ALTER TABLE public.finance_transactions
ADD CONSTRAINT finance_transactions_reference_not_empty_check
CHECK (
    reference_no IS NULL
    OR length(trim(reference_no)) > 0
);

-- ============================================================
-- 4. NOTIFICATIONS VALIDATION
-- ============================================================

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_title_not_empty_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_title_not_empty_check
CHECK (
    title IS NULL
    OR length(trim(title)) > 0
);

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_message_not_empty_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_message_not_empty_check
CHECK (
    message IS NULL
    OR length(trim(message)) > 0
);

-- ============================================================
-- 5. SYSTEM SETTINGS VALIDATION
-- ============================================================

ALTER TABLE public.system_settings
DROP CONSTRAINT IF EXISTS system_settings_key_not_empty_check;

ALTER TABLE public.system_settings
ADD CONSTRAINT system_settings_key_not_empty_check
CHECK (
    length(trim(key)) > 0
);

ALTER TABLE public.system_settings
DROP CONSTRAINT IF EXISTS system_settings_value_object_check;

ALTER TABLE public.system_settings
ADD CONSTRAINT system_settings_value_object_check
CHECK (
    value IS NOT NULL
);

-- ============================================================
-- 6. AUDIT LOG VALIDATION
-- ============================================================

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_action_not_empty_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_action_not_empty_check
CHECK (
    action IS NULL
    OR length(trim(action)) > 0
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_module_not_empty_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_module_not_empty_check
CHECK (
    module IS NULL
    OR length(trim(module)) > 0
);

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_record_id_not_empty_check;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_record_id_not_empty_check
CHECK (
    record_id IS NULL
    OR length(trim(record_id)) > 0
);

-- ============================================================
-- 7. COMMENTS
-- ============================================================

COMMENT ON TABLE public.profiles IS
'Core user profiles with database-level validation enabled.';

COMMENT ON TABLE public.roles IS
'Application roles with validated role names and JSON permissions.';

COMMENT ON TABLE public.finance_transactions IS
'Financial transactions with validated classifications and amounts.';

COMMENT ON TABLE public.notifications IS
'User notifications with validated optional text fields.';

COMMENT ON TABLE public.system_settings IS
'Application settings with validated keys and JSONB values.';

COMMENT ON TABLE public.audit_logs IS
'Append-oriented audit history with validated text fields.';

COMMIT;