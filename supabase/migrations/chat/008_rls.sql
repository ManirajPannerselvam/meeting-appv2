-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 008
-- File Name     : 008_rls.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Configure Row Level Security (RLS) for chat.
--
-- DESCRIPTION
--   Enables Row Level Security on all chat tables and
--   defines secure access policies for authenticated users,
--   room members and administrators.
--
-- DEPENDS ON
--   001_chat_rooms.sql
--   002_chat_messages.sql
--   003_chat_attachments.sql
--   004_chat_reactions.sql
--   005_chat_read_receipts.sql
--   006_chat_presence.sql
--   007_indexes.sql
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
--   - Enable Row Level Security.
--   - SELECT policies.
--   - INSERT policies.
--   - UPDATE policies.
--   - DELETE policies.
--   - Uses auth.uid().
-- ============================================================

BEGIN;

-- 1. Enable Row Level Security

-- 2. Chat Rooms Policies

-- 3. Chat Messages Policies

-- 4. Chat Attachments Policies

-- 5. Chat Reactions Policies

-- 6. Chat Read Receipts Policies

-- 7. Chat Presence Policies

-- 8. Service Role Policies

-- 9. Comments

COMMIT;