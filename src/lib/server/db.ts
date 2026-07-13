import Database from "better-sqlite3";
import path from "path";

// DB PATH
const dbPath =
    process.env.DB_PATH ||
    path.join(process.cwd(), "meeting.db");

const db = new Database(dbPath);
console.log("=================================");
console.log("Database Path:", dbPath);
console.log("=================================");

// Performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

/* ===================== TABLES ===================== */

db.prepare(`
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  agenda TEXT,
  meeting_date TEXT,
  meeting_type TEXT,
  location TEXT,
  start_time TEXT,
  end_time TEXT,
  participants TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER,
  user_id INTEGER,
  present INTEGER,
  timestamp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  display_name TEXT,
  role TEXT,
  email TEXT,
  password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

/* ================= USERS MIGRATION ================= */

try {
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    const userNames = userCols.map((c: any) => c.name);
    
    if (!userNames.includes("status")) {
        db.prepare("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'offline'").run();
        console.log("Added status column to users");
    }
    if (!userNames.includes("last_seen")) {
        db.prepare("ALTER TABLE users ADD COLUMN last_seen TEXT").run();
        console.log("Added last_seen column to users");
    }
    if (!userNames.includes("mobile")) {
        db.prepare("ALTER TABLE users ADD COLUMN mobile TEXT").run();
        console.log("Added mobile column to users");
    }
} catch (e) {
    console.log("users migration:", e);
}

db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  contact_id INTEGER,
  sender TEXT,
  message TEXT,
  type TEXT DEFAULT 'text',
  delivered INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

/* ================= MESSAGES MIGRATION ================= */

try {
    const msgCols = db.prepare("PRAGMA table_info(messages)").all();
    const msgNames = msgCols.map((c: any) => c.name);
    
    if (!msgNames.includes("type")) {
        db.prepare("ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'").run();
        console.log("Added type column");
    }
    if (!msgNames.includes("delivered")) {
        db.prepare("ALTER TABLE messages ADD COLUMN delivered INTEGER DEFAULT 0").run();
        console.log("Added delivered column");
    }
    if (!msgNames.includes("read")) {
        db.prepare("ALTER TABLE messages ADD COLUMN read INTEGER DEFAULT 0").run();
        console.log("Added read column");
    }
    if (!msgNames.includes("template_id")) {
        db.prepare("ALTER TABLE messages ADD COLUMN template_id INTEGER").run();
        console.log("Added template_id column to messages");
    }
} catch (e) {
    console.log("messages migration:", e);
}

db.prepare(`
CREATE TABLE IF NOT EXISTS chat_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  mobile TEXT UNIQUE,
  department TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

/* ==========================================================
   MESSAGE RECEIPTS TABLE - NEW - ADD THIS
========================================================== */

db.prepare(`
CREATE TABLE IF NOT EXISTS message_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER,
  mobile TEXT NOT NULL,
  group_id INTEGER,
  contact_id INTEGER,
  delivered INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  delivered_at TEXT,
  read_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
)
`).run();

/* ================= MESSAGE_RECEIPTS INDEXES ================= */

try {
    db.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_message ON message_receipts(message_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_mobile ON message_receipts(mobile)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_group ON message_receipts(group_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_contact ON message_receipts(contact_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_read ON message_receipts(read)").run();
} catch (e) {
    console.log("message_receipts index creation:", e);
}

/* ================= RECURRING MEETINGS ================= */

db.prepare(`
CREATE TABLE IF NOT EXISTS recurring_meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  frequency TEXT,
  start_date TEXT,
  participants TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

/* ==========================================================
   TEMPLATE MASTER - FIXED
========================================================== */

try {
    const cols: any[] = db.prepare("PRAGMA table_info(templates)").all();
    const names = cols.map(c => c.name);

    if (cols.length > 0 && !names.includes("template_code")) {
        console.log("Dropping old templates table...");
        db.prepare("DROP TABLE templates").run();
    }
} catch {}

db.prepare(`
CREATE TABLE IF NOT EXISTS templates(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_code TEXT UNIQUE,
    name TEXT NOT NULL,
    department TEXT,
    category TEXT,
    version INTEGER DEFAULT 1,
    icon TEXT,
    description TEXT,
    color TEXT DEFAULT '#2563eb',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

/* ================= TEMPLATES MIGRATION - FIXED ================= */

try {
    const cols = db.prepare("PRAGMA table_info(templates)").all();
    const names = cols.map((c: any) => c.name);

    if (!names.includes("category")) {
        db.prepare("ALTER TABLE templates ADD COLUMN category TEXT DEFAULT ''").run();
        console.log("Added category column");
    }
    if (!names.includes("color")) {
        db.prepare("ALTER TABLE templates ADD COLUMN color TEXT DEFAULT '#2563eb'").run();
        console.log("Added color column");
    }
    if (!names.includes("updated_at")) {
        db.prepare("ALTER TABLE templates ADD COLUMN updated_at TEXT").run();
        db.prepare("UPDATE templates SET updated_at = datetime('now') WHERE updated_at IS NULL").run();
        console.log("Added updated_at column");
    }
} catch (e) {
    console.log("templates migration:", e);
}

/* ==========================================================
TEMPLATE FIELDS
========================================================== */

db.prepare(`CREATE TABLE IF NOT EXISTS template_fields(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    placeholder TEXT,
    required INTEGER DEFAULT 0,
    readonly INTEGER DEFAULT 0,
    hidden INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    default_value TEXT,
    formula TEXT,
    options_json TEXT,
    min_value REAL,
    max_value REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    UNIQUE(template_id, field_name)
)`).run();

/* ================= TEMPLATE_FIELDS MIGRATION ================= */

try {
    const cols: any[] = db.prepare("PRAGMA table_info(template_fields)").all();
    const names = cols.map(c => c.name);

    if (!names.includes("placeholder")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN placeholder TEXT").run();
    }
    if (!names.includes("readonly")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN readonly INTEGER DEFAULT 0").run();
    }
    if (!names.includes("hidden")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN hidden INTEGER DEFAULT 0").run();
    }
    if (!names.includes("formula")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN formula TEXT").run();
    }
    if (!names.includes("options_json")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN options_json TEXT").run();
    }
    if (!names.includes("min_value")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN min_value REAL").run();
    }
    if (!names.includes("max_value")) {
        db.prepare("ALTER TABLE template_fields ADD COLUMN max_value REAL").run();
    }
} catch (e) {
    console.log("template_fields migration:", e);
}

/* ==========================================================
   USER INSTALLED TEMPLATE
========================================================== */

db.prepare(`
CREATE TABLE IF NOT EXISTS installed_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_code TEXT,
    template_id INTEGER,
    template_version INTEGER,
    template_name TEXT,
    installed_by TEXT,
    installed_date TEXT DEFAULT CURRENT_TIMESTAMP,
    last_update TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
)
`).run();

/* ==========================================================
   TEMPLATE Version
========================================================== */

db.prepare(`
CREATE TABLE IF NOT EXISTS template_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    version INTEGER,
    description TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
)
`).run();

/* ==========================================================
   TEMPLATE REPORTS
========================================================== */

db.prepare(`
CREATE TABLE IF NOT EXISTS template_reports(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    template_version INTEGER DEFAULT 1,
    sender TEXT,
    group_id INTEGER,
    contact_id INTEGER,
    report_date TEXT,
    values_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
)
`).run();

/* ================= TEMPLATE_REPORTS MIGRATION ================= */

try {
    const cols = db.prepare("PRAGMA table_info(template_reports)").all();
    const names = cols.map((c: any) => c.name);

    if (!names.includes("template_version")) {
        db.prepare("ALTER TABLE template_reports ADD COLUMN template_version INTEGER DEFAULT 1").run();
    }
    if (!names.includes("sender")) {
        db.prepare("ALTER TABLE template_reports ADD COLUMN sender TEXT").run();
    }
    if (!names.includes("group_id")) {
        db.prepare("ALTER TABLE template_reports ADD COLUMN group_id INTEGER").run();
    }
    if (!names.includes("contact_id")) {
        db.prepare("ALTER TABLE template_reports ADD COLUMN contact_id INTEGER").run();
    }
    if (!names.includes("report_date")) {
        db.prepare("ALTER TABLE template_reports ADD COLUMN report_date TEXT").run();
    }
    if (!names.includes("values_json")) {
        db.prepare("ALTER TABLE template_reports ADD COLUMN values_json TEXT").run();
    }
} catch (e) {
    console.log("template_reports migration:", e);
}

/* ==========================================================
   TEMPLATE MESSAGE LINK
========================================================== */

db.prepare(`
CREATE TABLE IF NOT EXISTS template_messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    report_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES template_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
)
`).run();

/* ================= INDEXES FOR PERFORMANCE ================= */

try {
    db.prepare("CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_template_reports_template ON template_reports(template_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_template_messages_message ON template_messages(message_id)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_templates_code ON templates(template_code)").run();
} catch (e) {
    console.log("Index creation:", e);
}

/* ================= FUNCTIONS ================= */

export function saveRecurringMeeting(data: {
  title: string;
  frequency: string;
  start_date: string;
  participants: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO recurring_meetings
    (title, frequency, start_date, participants)
    VALUES (?,?,?,?)
  `);

  return stmt.run(
    data.title,
    data.frequency,
    data.start_date,
    data.participants
  );
}

export function getAttendance() {
  return db.prepare(`
    SELECT * FROM attendance ORDER BY id DESC
  `).all();
}

export function getTemplates() {
  return db.prepare(`
    SELECT * FROM templates ORDER BY created_at DESC
  `).all();
}

export function getTemplateById(id: number) {
  return db.prepare(`
    SELECT * FROM templates WHERE id = ?
  `).get(id);
}

export function getTemplateFields(templateId: number) {
  return db.prepare(`
    SELECT * FROM template_fields 
    WHERE template_id = ? 
    ORDER BY display_order ASC
  `).all(templateId);
}

/* ==========================================================
   DEFAULT TEMPLATE
========================================================== */

try {
    const count: any = db
    .prepare("SELECT COUNT(*) as total FROM templates")
    .get();

    if (count.total === 0) {
        console.log("Creating default template...");

        const insertTemplate = db.prepare(`
            INSERT INTO templates
            (template_code,name,department,category,version,icon,description,created_by,color)
            VALUES (?,?,?,?,?,?,?,?,?)
        `);

        const result = insertTemplate.run(
            'PROD001',
            'Hourly Production',
            'Production',
            'Daily Report',
            1,
            '📊',
            'Hourly Production Report',
            'System',
            '#2563eb'
        );

        const templateId = result.lastInsertRowid;

        const insertField = db.prepare(`
            INSERT INTO template_fields
            (template_id, field_name, field_label, field_type, required, display_order)
            VALUES (?,?,?,?,?,?)
        `);

        insertField.run(templateId, "Machine", "Machine", "text", 1, 1);
        insertField.run(templateId, "Shift", "Shift", "dropdown", 1, 2);
        insertField.run(templateId, "InputQty", "Input Qty", "number", 1, 3);
        insertField.run(templateId, "OutputQty", "Output Qty", "number", 1, 4);
        insertField.run(templateId, "Yield", "Yield %", "formula", 0, 5);
        insertField.run(templateId, "Remarks", "Remarks", "textarea", 0, 6);

        db.prepare(`
        UPDATE template_fields
        SET formula='(OutputQty/InputQty)*100'
        WHERE template_id=? AND field_name='Yield'
        `).run(templateId);

        db.prepare(`
        UPDATE template_fields
        SET options_json='["Day","Night"]'
        WHERE template_id=? AND field_name='Shift'
        `).run(templateId);

        console.log("Default template created with ID:", templateId);
    }
} catch (e) {
    console.error("Default template creation failed:", e);
}

/* ================= EXPORT ================= */

export function getDB() {
  return db;
}

console.log("=== Database initialized successfully ===");

export default db;