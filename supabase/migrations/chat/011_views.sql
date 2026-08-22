-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 011
-- File Name     : 011_views.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Create database views for chat operations.
--
-- DESCRIPTION
--   Provides reusable read-only views for room lists,
--   recent chats, unread messages, attachments and
--   dashboard analytics.
--
-- DEPENDS ON
--   001_chat_rooms.sql
--   002_chat_messages.sql
--   003_chat_attachments.sql
--   004_chat_reactions.sql
--   005_chat_read_receipts.sql
--   006_chat_presence.sql
--   007_indexes.sql
--   008_rls.sql
--   009_triggers.sql
--   010_rpc.sql
--
-- TABLES
--   public.chat_rooms
--   public.chat_messages
--   public.chat_attachments
--   public.chat_reactions
--   public.chat_read_receipts
--   public.chat_presence
--
-- NOTES
--   - Views only.
--   - No tables.
--   - No indexes.
--   - No triggers.
--   - No RPC functions.
-- ============================================================

BEGIN;

-- 1. Active Chat Rooms View

-- 2. Recent Chats View

-- 3. Chat Room Summary View

-- 4. Unread Messages View

-- 5. Latest Messages View

-- 6. Attachments View

-- 7. User Activity View

-- 8. Chat Statistics View

-- 9. Search View

-- 10. Comments

COMMIT;