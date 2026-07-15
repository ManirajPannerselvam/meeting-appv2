import { isTauri } from "$lib/utils/env";

let db: any = null;

// ===============================
// Initialize Database
// ===============================
export async function initDB() {
    if (db) return db;
    if (typeof window === 'undefined') return null; // SSR guard

    try {
        const Database = await import("@tauri-apps/plugin-sql");
        let dbPath = "sqlite:meeting.db";

        try {
            const pathApi = await import("@tauri-apps/api/path");
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
        // Templates Table - added chartX, chartY
        // ===============================
        await db.execute(`
        CREATE TABLE IF NOT EXISTS templates(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            department TEXT,
            chart TEXT,
            chart_x TEXT,
            chart_y TEXT,
            fields TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        `);

        // ===============================
        // Auto Refresh Events
        // ===============================
        const originalExecute = db.execute.bind(db);
        db.execute = async (query: string, params?: any[]) => {
            const result = await originalExecute(query, params);
            if (/meetings/i.test(query) && /(INSERT|UPDATE|DELETE)/i.test(query)) {
                window.dispatchEvent(new CustomEvent("meetings:updated"));
            }
            if (/templates/i.test(query) && /(INSERT|UPDATE|DELETE)/i.test(query)) {
                window.dispatchEvent(new CustomEvent("templates:updated"));
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
// Save Template - handles INSERT + UPDATE
// ===============================
export async function saveTemplate(data: any) {
    const database = await initDB();
    if (!database) return false;

    const fieldsJson = JSON.stringify(data.fields || []);

    if (data.id) {
        // UPDATE existing
        await database.execute(
            `UPDATE templates
             SET name =?, department =?, chart =?, chart_x =?, chart_y =?, fields =?, updated_at = CURRENT_TIMESTAMP
             WHERE id =?`,
            [
                data.name,
                data.department,
                data.chart,
                data.chartX || null,
                data.chartY || null,
                fieldsJson,
                data.id
            ]
        );
    } else {
        // INSERT new
        await database.execute(
            `INSERT INTO templates (name, department, chart, chart_x, chart_y, fields)
             VALUES(?,?,?,?,?,?)`,
            [
                data.name,
                data.department,
                data.chartX || null,
                data.chartY || null,
                fieldsJson
            ]
        );
    }

    window.dispatchEvent(new CustomEvent("templates:updated"));
    return true;
}

// ===============================
// Get Templates
// ===============================
export async function getTemplates() {
    const database = await initDB();
    if (!database) return [];

    const rows = await database.select(`SELECT * FROM templates ORDER BY id DESC`);

    return rows.map((r: any) => ({
       ...r,
        fields: safeParseJSON(r.fields, []),
        chartX: r.chart_x,
        chartY: r.chart_y
    }));
}

// ===============================
// Get Template By ID - for editing
// ===============================
export async function getTemplateById(id: string | number) {
    const database = await initDB();
    if (!database) return null;

    const rows = await database.select(`SELECT * FROM templates WHERE id =?`, [id]);
    if (!rows.length) return null;

    const r = rows[0];
    return {
       ...r,
        fields: safeParseJSON(r.fields, []),
        chartX: r.chart_x,
        chartY: r.chart_y
    };
}

// ===============================
// Delete Template
// ===============================
export async function deleteTemplate(id: string | number) {
    const database = await initDB();
    if (!database) return false;

    await database.execute(`DELETE FROM templates WHERE id =?`, [id]);
    window.dispatchEvent(new CustomEvent("templates:updated"));
    return true;
}

// ===============================
// Helpers
// ===============================
function safeParseJSON(str: string, fallback: any) {
    try {
        return JSON.parse(str || "");
    } catch {
        return fallback;
    }
}

export function getDB() {
    return db;
}