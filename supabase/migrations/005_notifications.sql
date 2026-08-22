-- ============================================================
-- Temple Operations Reporting System
-- Database      : Core Database
-- Migration No. : 005
-- File Name     : 005_notifications.sql
-- ============================================================
-- PURPOSE
--   Store user notifications.
--
-- DESIGN TARGET
--   - 30,000+ users
--   - ~200 concurrent users
--   - Fast unread/recent notification loading
--   - Low storage and index overhead
--   - Safe long-term retention
--
-- SECURITY
--   - Users can read their own notifications.
--   - Users can mark their own notifications as read.
--   - Users can delete their own notifications.
--   - Normal authenticated clients cannot create notifications.
--   - Trusted server-side code creates notifications.
--
-- DEPENDS ON
--   001_profiles.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (

    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id uuid NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    title text,

    message text,

    is_read boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now()

);

-- ============================================================
-- 2. BASIC VALIDATION
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
-- 3. INDEXES
-- ============================================================
--
-- Main query:
--
--   SELECT ...
--   FROM notifications
--   WHERE user_id = ...
--   ORDER BY created_at DESC;
--
-- Keep the general user/date index for recent notifications.
--
-- The partial unread index is smaller and optimized for the
-- notification badge/unread list.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications (
    user_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON public.notifications (
    user_id,
    created_at DESC
)
WHERE is_read = false;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.notifications
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. SELECT POLICY
-- ============================================================

DROP POLICY IF EXISTS "Users can view own notifications"
ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 6. UPDATE POLICY
-- ============================================================
--
-- Primarily used for:
--
--   is_read = true
--
-- Users cannot move a notification to another user because
-- WITH CHECK also requires the same authenticated user.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own notifications"
ON public.notifications;

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

-- ============================================================
-- 7. INSERT POLICY
-- ============================================================
--
-- Intentionally NO INSERT policy for authenticated users.
--
-- This prevents a client from generating arbitrary notifications.
--
-- Trusted server-side code / service-role operations can create
-- notifications.
-- ============================================================

DROP POLICY IF EXISTS "Users can create own notifications"
ON public.notifications;

-- ============================================================
-- 8. DELETE POLICY
-- ============================================================
--
-- Users may delete their own notifications.
-- ============================================================

DROP POLICY IF EXISTS "Users can delete own notifications"
ON public.notifications;

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 9. COMMENTS
-- ============================================================

COMMENT ON TABLE public.notifications IS
'User-specific application notifications. Notifications are created by trusted application/server code.';

COMMENT ON COLUMN public.notifications.id IS
'Unique notification identifier.';

COMMENT ON COLUMN public.notifications.user_id IS
'Profile receiving the notification.';

COMMENT ON COLUMN public.notifications.title IS
'Short notification title.';

COMMENT ON COLUMN public.notifications.message IS
'Notification message body.';

COMMENT ON COLUMN public.notifications.is_read IS
'Indicates whether the user has read the notification.';

COMMENT ON COLUMN public.notifications.created_at IS
'Server timestamp when the notification was created.';

COMMIT;