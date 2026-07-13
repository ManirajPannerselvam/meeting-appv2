import { isTauri } from "$lib/utils/env";
import createSchema from "$lib/db/schema";

let db: any = null;
let initialized = false;

// ADD THIS: missing getDB function
function getDB() {
  if (!db) throw new Error("Database not initialized. Call initDB() first.");
  return db;
}

// FIXED: made async + await select calls
export async function getAnalytics() {
  const database = await initDB();
  if (!database) return { totalMeetings: 0, totalContacts: 0, totalGroups: 0, totalMessages: 0 };

  const [meetings, users, groups, messages] = await Promise.all([
    database.select('SELECT COUNT(*) as count FROM meetings'),
    database.select('SELECT COUNT(*) as count FROM users'),
    database.select('SELECT COUNT(*) as count FROM groups'),
    database.select('SELECT COUNT(*) as count FROM messages')
  ]);

  return {
    totalMeetings: meetings[0]?.count?? 0,
    totalContacts: users[0]?.count?? 0,
    totalGroups: groups[0]?.count?? 0,
    totalMessages: messages[0]?.count?? 0
  };
}

// FIXED: use select instead of prepare for consistency
export async function getAttendance() {
    const database = await initDB();
    if (!database) return [];
    return await database.select(`SELECT * FROM attendance ORDER BY id DESC`);
}

// ADD THIS: missing saveAttendance export
export async function saveAttendance(data: any) {
  const database = await initDB();
  if (!database) return false;

  await database.execute(`
    INSERT INTO attendance (
      employee_id, date, check_in, check_out, status, remarks
    ) VALUES (?,?,?,?,?,?)
  `, [
    data.employee_id,
    data.date,
    data.check_in || null,
    data.check_out || null,
    data.status || 'Present',
    data.remarks || ''
  ]);
  return true;
}

async function createInMemoryAdapter() {
  // Simple localStorage-backed adapter for development (non-Tauri) to avoid crashes.
  const key = "__mem_db__";
  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (e) {
      return {};
    }
  }
  function writeStore(s: any) {
    localStorage.setItem(key, JSON.stringify(s));
  }

  return {
    select: async (query: string, params?: any[]) => {
      const store = readStore();
      // Very small shim for most used selects
      if (/FROM meetings/i.test(query)) return store.meetings || [];
      if (/FROM devices/i.test(query)) return store.devices || [];
      if (/FROM actions/i.test(query)) return store.actions || [];
      if (/FROM attendance/i.test(query)) return store.attendance || [];
      if (/FROM users/i.test(query)) return store.users || [];
      if (/FROM groups/i.test(query)) return store.groups || [];
      if (/FROM messages/i.test(query)) return store.messages || [];
      if (/COUNT\(\*\)/i.test(query)) {
        const tbl = (query.match(/FROM\s+(\w+)/i) || [])[1];
        const arr = store[tbl] || [];
        return [{ count: arr.length }];
      }
      return [];
    },
    execute: async (query: string, params?: any[]) => {
      const store = readStore();
      if (/INSERT INTO meetings/i.test(query)) {
        store.meetings = store.meetings || [];
        const id = (store.meetings.length? store.meetings[store.meetings.length - 1].id : 0) + 1;
        store.meetings.push({ id, title: params?.[0], meeting_date: params?.[1], meeting_type: params?.[2], location: params?.[3], agenda: params?.[4] });
        writeStore(store);
        try {
          if (typeof window!== 'undefined') {
            window.dispatchEvent(new CustomEvent('meetings:updated'));
          }
        } catch (e) {}
        return;
      }
      if (/INSERT INTO actions/i.test(query)) {
        store.actions = store.actions || [];
        const id = (store.actions.length? store.actions[store.actions.length - 1].id : 0) + 1;
        store.actions.push({ id, meeting_id: params?.[0], description: params?.[1], status: params?.[2] });
        writeStore(store);
        return;
      }
      if (/INSERT INTO devices/i.test(query)) {
        store.devices = store.devices || [];
        const id = (store.devices.length? store.devices[store.devices.length - 1].id : 0) + 1;
        store.devices.push({ id, device_model: params?.[0], imei: params?.[1], android_version: params?.[2], build_version: params?.[3], sim_number: params?.[4], owner: params?.[5], status: params?.[6], remarks: params?.[7] });
        writeStore(store);
        return;
      }
      if (/INSERT INTO attendance/i.test(query)) {
        store.attendance = store.attendance || [];
        const id = (store.attendance.length? store.attendance[store.attendance.length - 1].id : 0) + 1;
        store.attendance.push({
          id,
          employee_id: params?.[0],
          date: params?.[1],
          check_in: params?.[2],
          check_out: params?.[3],
          status: params?.[4],
          remarks: params?.[5]
        });
        writeStore(store);
        return;
      }
      // basic delete/update no-op for dev shim
      return;
    }
  };
}

export async function initDB() {
  if (initialized && db) return db;

  if (!isTauri()) {
    // Browser / dev: provide lightweight in-memory adapter to avoid crashes and preserve functionality for UI testing.
    try {
      db = await createInMemoryAdapter();
      initialized = true;
      return db;
    } catch (e) {
      console.warn("initDB: failed to create in-memory adapter", e);
      return null;
    }
  }

  try {
// Running inside Tauri
const DatabaseModule = await import("@tauri-apps/plugin-sql");
const Database = DatabaseModule.default;

console.log("Opening SQLite database...");

db = await Database.load("sqlite:meeting.db");

console.log("Database opened successfully.");

// Create tables if needed
try {
    await createSchema(db);
    console.log("Database schema ready.");
} catch (e) {
    console.warn("createSchema failed:", e);
}

initialized = true;
return db;

  } catch (error) {
    // do not crash the app
    // eslint-disable-next-line no-console
    console.error("Database initialization failed:", error);
    return null;
  }
}

/* ==========================
MEETINGS
========================== */
export async function getMeetings() {

    const database = await initDB();

    if (!database) return [];

    const rows = await database.select(`
        SELECT *
        FROM meetings
        ORDER BY meeting_date DESC, id DESC
    `);

    return rows.map((m: any) => ({

        id: Number(m.id),

        title: m.title?? "",

        type: m.meeting_type?? "",

        date: m.meeting_date?? "",

        start_time: m.start_time?? "",

        end_time: m.end_time?? "",

        time: m.start_time?? "",

        location: m.location?? "",

        organizer: m.organizer?? "",

        description: m.description?? "",

        agenda: m.agenda?? "",

        status: m.status?? "Upcoming",

        created_by: m.created_by?? "",

        created_at: m.created_at?? ""

    }));

}

/* ==========================
MEETINGS - ADD
========================== */

export async function addMeeting(data: any) {

    const database = await initDB();

    if (!database) return false;

    // -------------------------
    // Calculate meeting status
    // -------------------------

    const now = new Date();

    const meetingDateTime = new Date(
        `${data.date}T${data.start_time || "00:00"}`
    );

    let status = "Upcoming";

    if (meetingDateTime.toDateString() === now.toDateString()) {

        status = "Today";

    } else if (meetingDateTime < now) {

        status = "Completed";

    }

    await database.execute(

        `
        INSERT INTO meetings (

            title,
            meeting_type,
            meeting_date,
            start_time,
            end_time,
            location,
            organizer,
            description,
            agenda,
            status,
            created_by

        )

        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `,

        [

            data.title || "",

            data.type || "",

            data.date || "",

            data.start_time || "",

            data.end_time || "",

            data.location || "",

            data.organizer || "",

            data.description || "",

            data.agenda || "",

            status,

            data.created_by || "Admin"

        ]

    );

    if (typeof window!== "undefined") {

        window.dispatchEvent(

            new CustomEvent("meetings:updated")

        );

    }

    return true;

}
export async function getMeeting(id:number){

    const database=await initDB();

    if(!database) return null;

    const rows=await database.select(

        "SELECT * FROM meetings WHERE id=?",

        [id]

    );

    if(rows.length==0) return null;

    const m=rows[0];

    return{

        id:m.id,

        title:m.title,

        type:m.meeting_type,

        date:m.meeting_date,

        start_time:m.start_time,

        end_time:m.end_time,

        location:m.location,

        organizer:m.organizer,

        description:m.description,

        agenda:m.agenda,

        status:m.status,

        created_by:m.created_by

    };

}

export async function updateMeeting(id:number,data:any){

    const database=await initDB();

    if(!database) return false;

    await database.execute(

`UPDATE meetings
SET

title=?,

meeting_type=?,

meeting_date=?,

start_time=?,

end_time=?,

location=?,

organizer=?,

description=?,

agenda=?,

status=?

WHERE id=?`,

[

data.title,

data.type,

data.date,

data.start_time,

data.end_time,

data.location,

data.organizer,

data.description,

data.agenda,

data.status,

id

]

);

window.dispatchEvent(

new CustomEvent("meetings:updated")

);

return true;

}
export async function deleteMeeting(id:number){

    const database=await initDB();

    if(!database) return false;

    await database.execute(

        "DELETE FROM meetings WHERE id=?",

        [id]

    );

    window.dispatchEvent(

        new CustomEvent("meetings:updated")

    );

    return true;

}
/* ==========================
ACTIONS
========================== */
export async function getActions() {
  const database = await initDB();
  if (!database) return [];

  return await database.select(
    "SELECT * FROM actions ORDER BY id DESC"
  );
}

export async function addAction(
  meetingId: number,
  description: string,
  status: string
) {
  const database = await initDB();
  if (!database) return false;

  await database.execute(
    `
    INSERT INTO actions
    (meeting_id, description, status)
    VALUES (?,?,?)
    `,
    [meetingId, description, status]
  );

  return true;
}

/* ==========================
DEVICES
========================== */
export async function saveDevice(data: any) {
  const database = await initDB();
  if (!database) return false;

  await database.execute(
    `
    INSERT INTO devices (
      device_model,
      imei,
      android_version,
      build_version,
      sim_number,
      owner,
      status,
      remarks
    )
    VALUES (?,?,?,?,?,?,?,?)
    `,
    [
      data.deviceModel,
      data.imei,
      data.androidVersion,
      data.buildVersion,
      data.simNumber,
      data.owner,
      data.status,
      data.remarks
    ]
  );

  return true;
}

export async function getDevices() {
  const database = await initDB();
  if (!database) return [];

  return await database.select(
    "SELECT * FROM devices ORDER BY id DESC"
  );
}

/* ==========================
RF TESTS
========================== */
export async function saveRFTest(data: any) {
  const database = await initDB();
  if (!database) return false;

  try {
    if (typeof database.execute === 'function') {
      await database.execute(
        `INSERT INTO rf_tests (model, imei, band, result, tested_by, created_at) VALUES (?,?,?,?,?,?)`,
        [data.deviceModel, data.imei || '', data.testCase || '', data.result || '', data.tester || '', data.testDate || new Date().toISOString()]
      );
      return true;
    }
  } catch (e) {
    console.warn('saveRFTest failed', e);
  }
  return false;
}

export async function getRFTests() {
  const database = await initDB();
  if (!database) return [];
  try {
    return await database.select('SELECT * FROM rf_tests ORDER BY id DESC');
  } catch (e) { return []; }
}

/* ==========================
SIMs
========================== */
export async function saveSIM(data: any) {
  const database = await initDB();
  if (!database) return false;
  try {
    await database.execute(
      `INSERT INTO sims (sim_number, operator, mobile_number, status, created_at) VALUES (?,?,?,?,?)`,
      [data.simNumber, data.operatorName, data.assignedDevice || '', data.status || 'Available', new Date().toISOString()]
    );
    return true;
  } catch (e) { return false; }
}

export async function getSIMs() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM sims ORDER BY id DESC'); } catch (e) { return []; }
}

/* ==========================
SKILLS
========================== */
export async function saveSkill(data: any) {
  const database = await initDB();
  if (!database) return false;
  try {
    await database.execute(
      `INSERT INTO skills (employee_name, skill_name, skill_level, created_at) VALUES (?,?,?,?)`,
      [data.employeeId, data.skillName, data.level, new Date().toISOString()]
    );
    return true;
  } catch (e) { return false; }
}

export async function getSkills() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM skills ORDER BY id DESC'); } catch (e) { return []; }
}

/* ==========================
PRODUCTION REPORT
========================== */
export async function getProductionReport() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM production ORDER BY id DESC'); } catch (e) { return []; }
}

/* ==========================
DEFECTS
========================== */
export async function saveDefect(data: any) {
  const database = await initDB();
  if (!database) return false;
  try {
    await database.execute(
      `INSERT INTO defects (defect_id, title, device_model, description, status, created_at) VALUES (?,?,?,?,?,?)`,
      [data.defectId || '', data.title || '', data.deviceModel || '', data.description || '', data.status || 'Open', new Date().toISOString()]
    );
    return true;
  } catch (e) { return false; }
}

export async function getDefects() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM defects ORDER BY id DESC'); } catch (e) { return []; }
}

/* ==========================
EMPLOYEES
========================== */
export async function saveEmployee(data: any) {
  const database = await initDB();
  if (!database) return false;
  try {
    await database.execute(
      `INSERT INTO employees (employee_id, name, department, created_at) VALUES (?,?,?,?)`,
      [data.employeeId || '', data.name || '', data.department || '', new Date().toISOString()]
    );
    return true;
  } catch (e) { return false; }
}

export async function getEmployees() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM employees ORDER BY id DESC'); } catch (e) { return []; }
}

/* ==========================
NOTIFICATIONS
========================== */
export async function getNotifications() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM notifications ORDER BY id DESC'); } catch (e) { return []; }
}

export async function markNotificationRead(id: number) {
  const database = await initDB();
  if (!database) return false;
  try { await database.execute('UPDATE notifications SET read = 1 WHERE id =?', [id]); return true; } catch (e) { return false; }
}

/* ==========================
RECURRING MEETINGS (client accessors)
========================== */
export async function saveRecurringMeetingClient(data: any) {
  const database = await initDB();
  if (!database) return false;
  try { await database.execute('INSERT INTO recurring_meetings (title, frequency, start_date, participants) VALUES (?,?,?,?)', [data.title, data.frequency, data.start_date, data.participants || '']); return true; } catch (e) { return false; }
}

export async function getRecurringMeetings() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM recurring_meetings ORDER BY id DESC'); } catch (e) { return []; }
}

// Backward compatible name used by older pages
export const saveRecurringMeeting = saveRecurringMeetingClient;

/* ==========================
EXECUTIVE / KPI
========================== */
export async function getExecutiveDashboard() {
  const database = await initDB();
  if (!database) return [];
  try { return await database.select('SELECT * FROM production ORDER BY id DESC LIMIT 10'); } catch (e) { return []; }
}

export async function getKPIData() {
  // Simple mapping to production for now
  return await getProductionReport();
}