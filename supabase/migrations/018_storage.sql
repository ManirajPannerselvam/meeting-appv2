-- ===========================================
-- STORAGE BUCKETS
-- ===========================================

insert into storage.buckets (id, name, public)

values

('avatars', 'avatars', true),

('attachments', 'attachments', false),

('reports', 'reports', false),

('meeting-files', 'meeting-files', false),

('documents', 'documents', false)

on conflict (id) do nothing;