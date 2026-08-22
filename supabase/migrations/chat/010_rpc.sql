-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 010
-- File Name     : 010_rpc.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Create PostgreSQL RPC functions for the chat system.
--
-- DESCRIPTION
--   Provides secure, reusable database functions for
--   messaging, room management, unread counts and
--   synchronization.
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
--   - RPC Functions only.
--   - No tables.
--   - No indexes.
--   - No triggers.
--   - No RLS.
-- ============================================================

BEGIN;

-- 1. Create Room RPC

-- 2. Send Message RPC

-- 3. Edit Message RPC

-- 4. Delete Message RPC

-- 5. Add Reaction RPC

-- 6. Remove Reaction RPC

-- 7. Mark Messages Read RPC

-- 8. Get Unread Count RPC

-- 9. Search Messages RPC

-- 10. Get Chat History RPC

-- 11. Upload Attachment RPC

-- 12. Archive Chat Room RPC

-- 13. Restore Chat Room RPC

-- 14. Comments

COMMIT;