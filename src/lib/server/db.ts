// src/lib/server/db.ts - VERCEL SAFE - NO better-sqlite3 at all on Vercel
// On Vercel: always returns null -> use Supabase
// On Tauri: this file is REPLACED by db.desktop.ts via vite alias (or use dynamic import)

export const db = null;
export function getDB() { return null; }
export function getDb() { return null; }
export function saveRecurringMeeting() { return { lastInsertRowid: 0 }; }
export function getAttendance() { return []; }
export function getTemplates() { return []; }
export function getTemplateById() { return null; }
export function getTemplateFields() { return []; }
export default null;