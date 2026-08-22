-- =====================================================
-- USERS
-- =====================================================

create table if not exists users (

    id uuid primary key default gen_random_uuid(),

    employee_id text unique not null,

    first_name text not null,

    last_name text not null,

    full_name text generated always as
        (first_name || ' ' || last_name) stored,

    email text unique not null,

    mobile text,

    department text,

    designation text,

    role text,

    shift text,

    manager_id uuid,

    profile_photo text,

    status text default 'Active',

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);

-- =====================================================
-- USER PERMISSIONS
-- =====================================================

create table if not exists user_permissions (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references users(id)
        on delete cascade,

    module text not null,

    can_view boolean default false,

    can_create boolean default false,

    can_edit boolean default false,

    can_delete boolean default false,

    can_export boolean default false

);

-- =====================================================
-- ROLES
-- =====================================================

create table if not exists roles (

    id uuid primary key default gen_random_uuid(),

    name text unique not null,

    description text,

    created_at timestamptz default now()

);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

create table if not exists audit_logs (

    id uuid primary key default gen_random_uuid(),

    user_id uuid
        references users(id)
        on delete set null,

    module text,

    action text,

    description text,

    created_at timestamptz default now()

);

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists idx_users_department
on users(department);

create index if not exists idx_users_role
on users(role);

create index if not exists idx_users_status
on users(status);

create index if not exists idx_permissions_user
on user_permissions(user_id);

create index if not exists idx_audit_user
on audit_logs(user_id);

-- =====================================================
-- UPDATED AT TRIGGER
-- =====================================================

create or replace function update_updated_at()

returns trigger

language plpgsql

as $$

begin

    new.updated_at = now();

    return new;

end;

$$;

drop trigger if exists trg_users_updated
on users;

create trigger trg_users_updated

before update

on users

for each row

execute procedure update_updated_at();

-- =====================================================
-- DEFAULT ROLES
-- =====================================================

insert into roles(name,description)

values

('Admin','System Administrator'),

('Manager','Department Manager'),

('Supervisor','Production Supervisor'),

('Engineer','Engineer'),

('Operator','Operator'),

('Viewer','Read Only')

on conflict(name)

do nothing;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table users enable row level security;

alter table user_permissions enable row level security;

alter table audit_logs enable row level security;

-- =====================================================
-- USERS POLICY
-- =====================================================

create policy "Authenticated Users"

on users

for all

using (auth.role() = 'authenticated')

with check (auth.role() = 'authenticated');

-- =====================================================
-- PERMISSION POLICY
-- =====================================================

create policy "Authenticated Permissions"

on user_permissions

for all

using (auth.role() = 'authenticated')

with check (auth.role() = 'authenticated');

-- =====================================================
-- AUDIT POLICY
-- =====================================================

create policy "Authenticated Audit"

on audit_logs

for all

using (auth.role() = 'authenticated')

with check (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE USER
-- =====================================================

insert into users(

employee_id,

first_name,

last_name,

email,

department,

designation,

role,

shift

)

values(

'EMP001',

'Admin',

'User',

'admin@ems.com',

'Administration',

'System Administrator',

'Admin',

'General'

)

on conflict(employee_id)

do nothing;