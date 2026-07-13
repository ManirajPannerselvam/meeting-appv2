import { initDB } from "$lib/services/database";
import { log }from "$lib/debug/logger";

const REQUIRED_TABLES: { [k: string]: string } = {
  meetings: `
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      agenda TEXT,
      meeting_date TEXT,
      meeting_type TEXT
    );
  `,
  actions: `
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      description TEXT,
      status TEXT
    );
  `,
  devices: `
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_model TEXT,
      imei TEXT,
      android_version TEXT,
      build_version TEXT,
      sim_number TEXT,
      owner TEXT,
      status TEXT,
      remarks TEXT
    );
  `,
  sim_inventory: `
    CREATE TABLE IF NOT EXISTS sim_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sim_number TEXT,
      operator TEXT,
      status TEXT,
      remarks TEXT
    );
  `,
  attendance: `
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      user_id INTEGER,
      present INTEGER,
      timestamp TEXT
    );
  `,
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      display_name TEXT,
      role TEXT,
      email TEXT
    );
  `,
  backup: `
    CREATE TABLE IF NOT EXISTS backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT,
      created_at TEXT
    );
  `
};

export async function checkDBHealth() {
  const db = await initDB();
  if (!db) {
    await logger.error('DB_HEALTH', 'Database not available or failed to initialize');
    return {
      ok: false,
      message: 'Database not available'
    };
  }

  const results: { table: string; exists: boolean; created?: boolean }[] = [];

  for (const table of Object.keys(REQUIRED_TABLES)) {
    try {
      const rows = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table]);
      if (!rows || rows.length === 0) {
        // create
        await db.execute(REQUIRED_TABLES[table]);
        results.push({ table, exists: false, created: true });
        await logger.log('DB_HEALTH', `Created missing table: ${table}`);
      } else {
        results.push({ table, exists: true });
      }
    } catch (e) {
      results.push({ table, exists: false });
      await logger.error('DB_HEALTH', `Error checking/creating table ${table}: ${String(e)}`);
    }
  }

  await logger.log('DB_HEALTH', `DB health check completed. Tables: ${JSON.stringify(results)}`);

  return {
    ok: true,
    details: results
  };
}

export default { checkDBHealth };
