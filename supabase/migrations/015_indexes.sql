-- ===========================================
-- PROFILES
-- ===========================================

create index if not exists idx_profiles_email
on profiles(email);

create index if not exists idx_profiles_active
on profiles(is_active);

-- ===========================================
-- FINANCE
-- ===========================================

create index if not exists idx_finance_date
on finance_transactions(transaction_date);

create index if not exists idx_finance_type
on finance_transactions(transaction_type);

create index if not exists idx_finance_category
on finance_transactions(category);

create index if not exists idx_finance_created_by
on finance_transactions(created_by);

create index if not exists idx_finance_payment_method
on finance_transactions(payment_method);

-- ===========================================
-- AUDIT
-- ===========================================

create index if not exists idx_audit_action
on audit_logs(action);

create index if not exists idx_audit_module
on audit_logs(module);

create index if not exists idx_audit_user
on audit_logs(user_id);

create index if not exists idx_audit_created
on audit_logs(created_at desc);

-- ===========================================
-- NOTIFICATIONS
-- ===========================================

create index if not exists idx_notifications_user
on notifications(user_id);

create index if not exists idx_notifications_read
on notifications(is_read);

create index if not exists idx_notifications_created
on notifications(created_at desc);

-- ===========================================
-- ROLES
-- ===========================================

create unique index if not exists idx_roles_name
on roles(role_name);