-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 006
-- File Name     : 006_chat_presence.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Create user presence and typing status support.
--
-- DESCRIPTION
--   Tracks user online status, last seen, active device,
--   typing indicators and current room activity.
--
-- DEPENDS ON
--   001_chat_rooms.sql
--   002_chat_messages.sql
--   003_chat_attachments.sql
--   004_chat_reactions.sql
--   005_chat_read_receipts.sql
--
-- TABLE
--   public.chat_presence
--
-- NOTES
--   - One presence record per authenticated user.
--   - Optimized for Supabase Realtime Presence.
--   - Supports Online, Offline, Away and Typing states.
-- ============================================================

BEGIN;

-- 1. Create chat_presence table

-- 2. Primary Key

-- 3. User Information

-- 4. Presence Status

-- 5. Typing Status

-- 6. Active Room Information

-- 7. Device Information

-- 8. Connection Information

-- 9. Timestamp Columns

-- 10. Default Values

-- 11. CHECK Constraints

-- 12. Comments

COMMIT;