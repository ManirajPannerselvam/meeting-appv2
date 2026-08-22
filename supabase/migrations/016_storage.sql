-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 016
-- File Name     : 016_storage.sql
-- ============================================================
-- PURPOSE
--   Configure Supabase Storage buckets and storage policies
--   for application files.
--
-- STORAGE AREAS
--   1. avatars
--   2. attachments
--   3. reports
--
-- SECURITY
--   - Avatars: authenticated users can manage their own files.
--   - Attachments: authenticated users can manage their own files.
--   - Reports: authenticated users can manage their own files.
--   - Public access is NOT enabled.
--
-- DEPENDS ON
--   001_profiles.sql
--   007_rls_policies.sql
--   008_triggers.sql
--   015_permissions.sql
--
-- IMPORTANT
--   Storage objects are protected by storage.objects RLS.
--   Application database RLS remains separate.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit
)
VALUES
(
    'avatars',
    'avatars',
    false,
    5242880
),
(
    'attachments',
    'attachments',
    false,
    20971520
),
(
    'reports',
    'reports',
    false,
    52428800
)
ON CONFLICT (id)
DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

-- ============================================================
-- 2. AVATARS
-- ============================================================

DROP POLICY IF EXISTS "Users can upload own avatars"
ON storage.objects;

CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own avatars"
ON storage.objects;

CREATE POLICY "Users can view own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own avatars"
ON storage.objects;

CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own avatars"
ON storage.objects;

CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 3. ATTACHMENTS
-- ============================================================

DROP POLICY IF EXISTS "Users can upload own attachments"
ON storage.objects;

CREATE POLICY "Users can upload own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own attachments"
ON storage.objects;

CREATE POLICY "Users can view own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own attachments"
ON storage.objects;

CREATE POLICY "Users can update own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own attachments"
ON storage.objects;

CREATE POLICY "Users can delete own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 4. REPORT FILES
-- ============================================================

DROP POLICY IF EXISTS "Users can upload own reports"
ON storage.objects;

CREATE POLICY "Users can upload own reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own reports"
ON storage.objects;

CREATE POLICY "Users can view own reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own reports"
ON storage.objects;

CREATE POLICY "Users can update own reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own reports"
ON storage.objects;

CREATE POLICY "Users can delete own reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 5. COMMENTS
-- ============================================================

COMMENT ON TABLE storage.buckets IS
'Supabase Storage buckets used by the Temple Operations Reporting System.';

COMMIT;