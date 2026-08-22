import { isTauri } from "$lib/utils/env";

let db: any = null;

// ===============================
// Initialize Database
// ===============================
export async function initDB() {
    if (db) return db;

    // SSR + Browser guard
    if (typeof window === "undefined" ||!isTauri()) {
        return null;
    }

    try {
        // FIX: plugin-sql v2 uses default export
        const { default: Database } = await import("@tauri-apps/plugin-sql");

        let dbPath = "sqlite:meeting.db";

        try {
            const { appDataDir } = await import("@tauri-apps/api/path");
            const appData = await appDataDir();
            dbPath = `sqlite:${appData}meeting.db`;
        } catch (e) {
            console.warn("[DB] Using default database path");
        }

        db = await Database.load(dbPath);

        // Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON");

        // ===============================
        // 1. Meetings Table
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
                priority TEXT DEFAULT 'Medium',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ===============================
        // 2. Templates Table
        // ===============================
        await db.execute(`
            CREATE TABLE IF NOT EXISTS templates(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
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
        // 3. Meeting Actions Table
        // ===============================
        await db.execute(`
            CREATE TABLE IF NOT EXISTS meeting_actions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER,
                meeting_title TEXT,
                description TEXT NOT NULL,
                owner TEXT,
                due_date TEXT,
                status TEXT DEFAULT 'Open',
                priority TEXT DEFAULT 'Medium',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(meeting_id)
                    REFERENCES meetings(id)
                    ON DELETE CASCADE
            )
        `);

        // ===============================
        // 4. Machine Downtime Table
        // ===============================
        await db.execute(`
            CREATE TABLE IF NOT EXISTS machine_downtime(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_name TEXT NOT NULL,
                reason TEXT,
                category TEXT,
                start_time TEXT,
                end_time TEXT,
                duration_minutes INTEGER,
                report_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ===============================
        // Auto Refresh Events
        // ===============================
        const originalExecute = db.execute.bind(db);

        db.execute = async (query: string, params?: any[]) => {
            const result = await originalExecute(query, params);
            const q = query.toLowerCase();

            if (q.includes("meetings") && /(insert|update|delete)/i.test(q)) {
                window.dispatchEvent(new CustomEvent("meetings:updated"));
            }
            if (q.includes("templates") && /(insert|update|delete)/i.test(q)) {
                window.dispatchEvent(new CustomEvent("templates:updated"));
            }
            if (q.includes("meeting_actions") && /(insert|update|delete)/i.test(q)) {
                window.dispatchEvent(new CustomEvent("actions:updated"));
            }
            if (q.includes("machine_downtime") && /(insert|update|delete)/i.test(q)) {
                window.dispatchEvent(new CustomEvent("downtime:updated"));
            }
            return result;
        };

        return db;
    } catch (err) {
        console.error("[DB] Init failed:", err);
        throw err;
    }
}

// ===============================
// TEMPLATES CRUD
// ===============================
export async function saveTemplate(data: any) {
    const database = await initDB();
    if (!database) return false;

    const fieldsJson = JSON.stringify(data.fields || []);

    try {
        if (data.id) {
            await database.execute(
                `UPDATE templates SET name=?, department=?, chart=?, chart_x=?, chart_y=?, fields=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                [data.name, data.department, data.chart || "table", data.chartX || data.chart_x || null, data.chartY || data.chart_y || null, fieldsJson, data.id]
            );
        } else {
            await database.execute(
                `INSERT INTO templates (name, department, chart, chart_x, chart_y, fields) VALUES (?,?,?,?)`,
                [data.name, data.department, data.chart || "table", data.chartX || data.chart_x || null, data.chartY || data.chart_y || null, fieldsJson]
            );
        }
        window.dispatchEvent(new CustomEvent("templates:updated"));
        return true;
    } catch (e) {
        console.error("[DB] saveTemplate failed:", e);
        return false;
    }
}

export async function getTemplates() {
    const database = await initDB();
    if (!database) return [];

    try {
        const rows = await database.select(`SELECT * FROM templates ORDER BY updated_at DESC`);
        return rows.map((r: any) => ({
           ...r,
            fields: safeParseJSON(r.fields, []),
            chartX: r.chart_x,
            chartY: r.chart_y
        }));
    } catch (e) {
        console.error("[DB] getTemplates failed:", e);
        return [];
    }
}

export async function deleteTemplate(id: number | string) {
    const database = await initDB();
    if (!database) return false;
    if (id === null || id === undefined || id === "") {
        console.warn("[DB] deleteTemplate called without an id");
        return false;
    }

    try {
        await database.execute(`DELETE FROM templates WHERE id=?`, [id]);
        window.dispatchEvent(new CustomEvent("templates:updated"));
        return true;
    } catch (e) {
        console.error("[DB] deleteTemplate failed:", e);
        return false;
    }
}

// ===============================
// MEETINGS CRUD
// ===============================
export async function getMeetings() {
    const database = await initDB();
    if (!database) return [];
    try {
        return await database.select(`SELECT * FROM meetings ORDER BY meeting_date DESC, start_time DESC`);
    } catch (e) {
        console.error("[DB] getMeetings failed:", e);
        return [];
    }
}

export async function saveMeeting(data: any) {
    const database = await initDB();
    if (!database) return false;

    try {
        if (data.id) {
            await database.execute(
                `UPDATE meetings SET title=?, meeting_type=?, meeting_date=?, start_time=?, end_time=?, location=?, organizer=?, agenda=?, status=?, priority=? WHERE id=?`,
                [data.title, data.meeting_type, data.meeting_date, data.start_time, data.end_time, data.location, data.organizer, data.agenda, data.status || "Scheduled", data.priority || "Medium", data.id]
            );
        } else {
            await database.execute(
                `INSERT INTO meetings (title, meeting_type, meeting_date, start_time, end_time, location, organizer, agenda, status, priority) VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [data.title, data.meeting_type, data.meeting_date, data.start_time, data.end_time, data.location, data.organizer, data.agenda, data.status || "Scheduled", data.priority || "Medium"]
            );
        }
        window.dispatchEvent(new CustomEvent("meetings:updated"));
        return true;
    } catch (e) {
        console.error("[DB] saveMeeting failed:", e);
        return false;
    }
}

// ===============================
// MEETING ACTIONS CRUD
// ===============================
export async function getMeetingActions() {
    const database = await initDB();
    if (!database) return [];
    try {
        return await database.select(`SELECT * FROM meeting_actions ORDER BY due_date ASC, id DESC`);
    } catch (e) {
        console.error("[DB] getMeetingActions failed:", e);
        return [];
    }
}

export async function saveMeetingAction(data: any) {
    const database = await initDB();
    if (!database) return false;

    try {
        if (data.id) {
            await database.execute(
                `UPDATE meeting_actions SET meeting_id=?, meeting_title=?, description=?, owner=?, due_date=?, status=?, priority=? WHERE id=?`,
                [data.meeting_id, data.meeting_title, data.description, data.owner, data.due_date, data.status || "Open", data.priority || "Medium", data.id]
            );
        } else {
            await database.execute(
                `INSERT INTO meeting_actions (meeting_id, meeting_title, description, owner, due_date, status, priority) VALUES (?,?,?)`,
                [data.meeting_id, data.meeting_title, data.description, data.owner, data.due_date, data.status || "Open", data.priority || "Medium"]
            );
        }
        window.dispatchEvent(new CustomEvent("actions:updated"));
        return true;
    } catch (e) {
        console.error("[DB] saveMeetingAction failed:", e);
        return false;
    }
}

// ===============================
// MACHINE DOWNTIME CRUD
// ===============================
export async function getMachineDowntime() {
    const database = await initDB();
    if (!database) return [];
    try {
        return await database.select(`SELECT * FROM machine_downtime ORDER BY report_date DESC`);
    } catch (e) {
        console.error("[DB] getMachineDowntime failed:", e);
        return [];
    }
}

export async function saveMachineDowntime(data: any) {
    const database = await initDB();
    if (!database) return false;

    try {
        if (data.id) {
            await database.execute(
                `UPDATE machine_downtime SET machine_name=?, reason=?, category=?, start_time=?, end_time=?, duration_minutes=?, report_date=? WHERE id=?`,
                [data.machine_name, data.reason, data.category, data.start_time, data.end_time, data.duration_minutes, data.report_date, data.id]
            );
        } else {
            await database.execute(
                `INSERT INTO machine_downtime (machine_name, reason, category, start_time, end_time, duration_minutes, report_date) VALUES (?,?,?,?,?,?)`,
                [data.machine_name, data.reason, data.category, data.start_time, data.end_time, data.duration_minutes, data.report_date]
            );
        }
        window.dispatchEvent(new CustomEvent("downtime:updated"));
        return true;
    } catch (e) {
        console.error("[DB] saveMachineDowntime failed:", e);
        return false;
    }
}

// ===============================
// Helpers
// ===============================
function safeParseJSON(str: string, fallback: any) {
    try {
        return JSON.parse(str || "[]");
    } catch {
        return fallback;
    }
}

// ===============================
// Get Raw Database
// ===============================
export function getDB() {
    return db;
}