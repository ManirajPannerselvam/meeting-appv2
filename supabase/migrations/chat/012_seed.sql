-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 012
-- File Name     : 012_seed.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Seed initial chat system data.
--
-- DESCRIPTION
--   Inserts the minimum required data for the chat
--   application to function after deployment.
--   Safe to execute multiple times (idempotent).
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
--   011_views.sql
--
-- TABLES
--   public.chat_rooms
--   public.chat_messages
--
-- NOTES
--   - Initial data only.
--   - No schema changes.
--   - No indexes.
--   - No RLS.
--   - No triggers.
-- ============================================================

BEGIN;

-- 1. Default Public Chat Rooms

-- 2. System Announcement Room

-- 3. Welcome Message

-- 4. Default Room Settings

-- 5. Default Reaction Set

-- 6. Development/Test Data (Optional)

-- 7. Comments

COMMIT;