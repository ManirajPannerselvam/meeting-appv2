-- ============================================================
-- Temple Operations Reporting System
-- Migration: 001_extensions.sql
-- Purpose : Enable required PostgreSQL extensions
-- ============================================================

-- UUID generation
create extension if not exists "pgcrypto";

-- Fast text search (Temple name, Template name, etc.)
create extension if not exists pg_trgm;

-- Case-insensitive text
create extension if not exists citext;