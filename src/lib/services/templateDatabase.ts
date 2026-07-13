import Database from "@tauri-apps/plugin-sql";

let db: Database;

export async function initTemplateDB() {
    if (!db) {
        db = await Database.load("sqlite:meeting.db");

        await db.execute(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            department TEXT,
            chart TEXT,
            xAxis TEXT,
            yAxis TEXT,
            fields TEXT,
            formula TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        `);
    }

    return db;
}

export async function getTemplates() {
    const database = await initTemplateDB();
    return await database.select("SELECT * FROM templates ORDER BY id DESC");
}

export async function saveTemplate(template: any) {
    const database = await initTemplateDB();

    await database.execute(
        `INSERT INTO templates
        (name,department,chart,xAxis,yAxis,fields,formula)
        VALUES(?,?,?,?,?,?,?)`,
        [
            template.name,
            template.department,
            template.chart,
            template.xAxis,
            template.yAxis,
            JSON.stringify(template.fields),
            template.formula
        ]
    );

    return true;
}

export async function deleteTemplate(id:number){

    const database=await initTemplateDB();

    await database.execute(
        "DELETE FROM templates WHERE id=?",
        [id]
    );

}