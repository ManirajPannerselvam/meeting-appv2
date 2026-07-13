import { initDB } from "$lib/services/database";
import { log } from "$lib/debug/logger";

export async function checkDBHealth() {
  const db = await initDB();

  if (!db) {
    await log("ERROR", "DB_HEALTH", "Database not available");
    return { ok: false };
  }

  try {
    const tables = ["meetings", "actions", "devices"];

    for (const table of tables) {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT)`
      );
    }

    await log("INFO", "DB_HEALTH", "Database OK");
    return { ok: true };

  } catch (err) {
    await log("ERROR", "DB_HEALTH", String(err));
    return { ok: false };
  }
}

export default { checkDBHealth };