-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 007
-- File Name     : 007_indexes.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Create indexes for high-performance chat operations.
--
-- DESCRIPTION
--   Adds B-Tree, Composite, Partial and Full-Text indexes
--   to optimize realtime messaging, room loading,
--   searching and unread message queries.
--
-- DEPENDS ON
--   001_chat_rooms.sql
--   002_chat_messages.sql
--   003_chat_attachments.sql
--   004_chat_reactions.sql
--   005_chat_read_receipts.sql
--   006_chat_presence.sql
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
--   - Indexes only.
--   - No tables.
--   - No triggers.
--   - No RLS.
--   - No RPC.
-- ============================================================

BEGIN;

-- 1. Chat Rooms Indexes

-- 2. Chat Messages Indexes

-- 3. Chat Attachments Indexes

-- 4. Chat Reactions Indexes

-- 5. Chat Read Receipts Indexes

-- 6. Chat Presence Indexes

-- 7. Composite Indexes

-- 8. Partial Indexes

-- 9. Full Text Search Indexes

-- 10. Comments

COMMIT;