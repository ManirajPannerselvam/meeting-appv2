/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/routes/api/downtime/+server.ts
 * ============================================================
 * PURPOSE
 *   Log machine downtime entries to SQLite
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import db from "$lib/server/db";

export interface DowntimePayload {
  machine: string;
  reason: string;
  duration: number;
  shift: string;
}

export async function POST({ request }: RequestEvent) {
  try {
    const data = await request.json() as DowntimePayload;

    // Ensure table exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS downtime (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        duration INTEGER NOT NULL,
        shift TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).run();

    // Insert downtime record
    db.prepare(`
      INSERT INTO downtime
      (machine_id, reason, duration, shift, created_at)
      VALUES (?, ?, ?)
    `).run(
      data.machine,
      data.reason,
      data.duration,
      data.shift,
      new Date().toISOString()
    );

    return Response.json({
      success: true,
      message: "Downtime logged successfully"
    });

  } catch (error) {
    console.error('[Downtime API] Error:', error);
    return Response.json(
      { success: false, error: 'Failed to log downtime' },
      { status: 500 }
    );
  }
}