-- ============================================================
-- Temple Operations Reporting System
-- Database      : Chat Database
-- Migration No. : 005
-- File Name     : 005_chat_read_receipts.sql
-- Author        : Your Name
-- Created       : YYYY-MM-DD
-- ============================================================
-- PURPOSE
--   Create read receipt support for chat messages.
--
-- DESCRIPTION
--   Tracks message delivery and read status for each user.
--   Enables single tick, double tick and read indicators.
--
-- DEPENDS ON
--   001_chat_rooms.sql
--   002_chat_messages.sql
--   003_chat_attachments.sql
--   004_chat_reactions.sql
--
-- TABLE
--   public.chat_read_receipts
--
-- NOTES
--   - One record per user per message.
--   - Optimized for realtime updates.
--   - Supports WhatsApp and Microsoft Teams style read receipts.
-- ============================================================

BEGIN;

-- 1. Create chat_read_receipts table

-- 2. Primary Key

-- 3. Foreign Keys

-- 4. Message Information

-- 5. User Information

-- 6. Delivery Status

-- 7. Read Status

-- 8. Timestamp Columns

-- 9. Default Values

-- 10. Unique Constraints

-- 11. CHECK Constraints

-- 12. Comments

COMMIT;