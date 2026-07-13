import { isTauri } from "$lib/utils/env";

let db: any = null;

// ===============================
// Initialize Database
// ===============================
export async function initDB() {

    if (db) return db;

    try {

        const Database = await import("@tauri-apps/plugin-sql");

        let dbPath = "sqlite:meeting.db";

        try {

            const pathApi = await import("@tauri-apps/api/path");

            // Tauri v2
            const appData = await pathApi.appDataDir();

            dbPath = `sqlite:${appData}meeting.db`;

        } catch (e) {
            console.warn("Using default database path");
        }

        db = await Database.default.load(dbPath);

        // ===============================
        // Meetings Table
        // ===============================
        await db.execute(`
        CREATE TABLE IF NOT EXISTS meetings(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            meeting_type TEXT,
            meeting_date TEXT,
            start_time TEXT,
            end_time TEXT,
            location TEXT,
            organizer TEXT,
            agenda TEXT,
            status TEXT DEFAULT 'Scheduled',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        `);

        // ===============================
        // Templates Table
        // ===============================
        await db.execute(`
        CREATE TABLE IF NOT EXISTS templates(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            department TEXT,
            chart TEXT,
            fields TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        `);

        // ===============================
        // Auto Refresh Events
        // ===============================
        const originalExecute = db.execute.bind(db);

        db.execute = async (query: string, params?: any[]) => {

            const result = await originalExecute(query, params);

            if (/meetings/i.test(query) &&
                /(INSERT|UPDATE|DELETE)/i.test(query)) {

                window.dispatchEvent(
                    new CustomEvent("meetings:updated")
                );
            }

            if (/templates/i.test(query) &&
                /(INSERT|UPDATE|DELETE)/i.test(query)) {

                window.dispatchEvent(
                    new CustomEvent("templates:updated")
                );
            }

            return result;
        };

        return db;

    } catch (err) {

        if (!isTauri()) return db;

        throw err;
    }
}

// ===============================
// Save Template
// ===============================
export async function saveTemplate(data: any) {

    const database = await initDB();

    if (!database) return false;

    await database.execute(
        `INSERT INTO templates
        (name,department,chart,fields)
        VALUES(?,?,?,?)`,
        [
            data.name,
            data.department,
            data.chart,
            JSON.stringify(data.fields)
        ]
    );

    window.dispatchEvent(
        new CustomEvent("templates:updated")
    );

    return true;
}

// ===============================
// Get Templates
// ===============================
export async function getTemplates() {

    const database = await initDB();

    if (!database) return [];

    const rows = await database.select(
        `SELECT * FROM templates ORDER BY id DESC`
    );

    return rows.map((r: any) => ({
        ...r,
        fields: JSON.parse(r.fields || "[]")
    }));
}

// ===============================
// Get Database
// ===============================
export function getDB() {
    return db;
}