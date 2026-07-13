import Database from "@tauri-apps/plugin-sql";

let db: Database;

export async function initProductionDB() {

    if (!db) {

        db = await Database.load("sqlite:meeting.db");

        await db.execute(`

        CREATE TABLE IF NOT EXISTS production(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            customer TEXT,

            model TEXT,

            line TEXT,

            shift TEXT,

            target INTEGER,

            actual INTEGER,

            ng INTEGER,

            downtime INTEGER,

            uph INTEGER,

            yield REAL,

            rr REAL,

            operator TEXT,

            remarks TEXT,

            created_at TEXT DEFAULT CURRENT_TIMESTAMP

        );

        `);

    }

    return db;

}

export async function getProduction(){

    const database=await initProductionDB();

    return await database.select(

        "SELECT * FROM production ORDER BY id DESC"

    );

}

export async function addProduction(data:any){

    const database=await initProductionDB();

    await database.execute(

`INSERT INTO production

(customer,model,line,shift,target,actual,ng,downtime,uph,yield,rr,operator,remarks)

VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,

[

data.customer,

data.model,

data.line,

data.shift,

data.target,

data.actual,

data.ng,

data.downtime,

data.uph,

data.yield,

data.rr,

data.operator,

data.remarks

]

);

return true;

}

export async function deleteProduction(id:number){

const database=await initProductionDB();

await database.execute(

"DELETE FROM production WHERE id=?",

[id]

);

return true;

}