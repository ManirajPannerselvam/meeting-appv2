-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 009
-- File Name     : 009_seed_data.sql
-- ============================================================
-- PURPOSE
--   Seed the minimum required roles and system settings.
--
-- DESIGN TARGET
--   - Idempotent
--   - Safe to execute repeatedly
--   - No duplicate roles/settings
--   - Small storage footprint
--   - Suitable for 30,000+ users
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
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DEFAULT ROLES
-- ============================================================

INSERT INTO public.roles (
    role_name,
    description,
    permissions
)
VALUES

(
    'SuperAdmin',
    'Full system access',
    '["*"]'::jsonb
),

(
    'Admin',
    'Administrative access',
    '[
        "dashboard",
        "reports",
        "finance",
        "analytics",
        "workflow",
        "users",
        "roles",
        "settings"
    ]'::jsonb
),

(
    'Manager',
    'Department management',
    '[
        "dashboard",
        "reports",
        "workflow",
        "analytics"
    ]'::jsonb
),

(
    'Accountant',
    'Finance management',
    '[
        "dashboard",
        "finance",
        "reports"
    ]'::jsonb
),

(
    'Staff',
    'Standard staff access',
    '[
        "dashboard",
        "workflow"
    ]'::jsonb
),

(
    'Viewer',
    'Read only',
    '[
        "dashboard"
    ]'::jsonb
)

ON CONFLICT (role_name)
DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 2. SYSTEM SETTINGS
-- ============================================================

INSERT INTO public.system_settings (
    key,
    value
)
VALUES

(
    'application',
    '{
        "name": "Temple Operations Reporting System",
        "version": "1.0.0",
        "timezone": "Asia/Kolkata"
    }'::jsonb
),

(
    'finance',
    '{
        "currency": "INR",
        "financial_year": "April-March"
    }'::jsonb
),

(
    'meeting',
    '{
        "default_duration": 60,
        "reminder_minutes": 15
    }'::jsonb
)

ON CONFLICT (key)
DO UPDATE SET
    value = EXCLUDED.value;

-- ============================================================
-- 3. COMMENTS
-- ============================================================

COMMENT ON TABLE public.roles IS
'Default application roles are seeded by migration 009.';

COMMENT ON TABLE public.system_settings IS
'Default application settings are seeded by migration 009.';

COMMIT;