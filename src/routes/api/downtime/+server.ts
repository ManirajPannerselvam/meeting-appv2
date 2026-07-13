import db from "$lib/server/db";

export async function POST({ request }) {
  const data = await request.json();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS downtime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT,
      reason TEXT,
      duration INTEGER,
      shift TEXT,
      created_at TEXT
    )
  `).run();

  db.prepare(`
    INSERT INTO downtime
    (machine_id, reason, duration, shift, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    data.machine,
    data.reason,
    data.duration,
    data.shift,
    new Date().toISOString()
  );

  return Response.json({
    success: true
  });
}