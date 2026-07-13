export default async function createSchema(db: any) {

  // ============================
  // Users
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      mobile TEXT UNIQUE,
      password TEXT,
      role TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Templates
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      department TEXT,
      version INTEGER DEFAULT 1,
      chart TEXT,
      fields TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Template Reports
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS template_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      template_version INTEGER DEFAULT 1,
      sender TEXT NOT NULL,
      group_id INTEGER,
      contact_id INTEGER,
      report_date TEXT,
      values_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );
  `);

  // ============================
  // Messages - WITH template_id
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      contact_id INTEGER,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      template_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES template_reports(id)
    );
  `);

  // ============================
  // Groups
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Contacts
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      mobile TEXT UNIQUE,
      department TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // OTP
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS otp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT,
      code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Meetings
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      meeting_type TEXT,
      meeting_date TEXT,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      organizer TEXT,
      description TEXT,
      agenda TEXT,
      status TEXT DEFAULT 'Scheduled',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Minutes
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS minutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Attendance
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      user_id INTEGER,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Action Items
  // ============================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      title TEXT,
      assigned_to TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================
  // Upgrade Old Database
  // ============================
  
  // Upgrade meetings table
  const meetingColumns = await db.select(`PRAGMA table_info(meetings)`);
  const meetingNames = meetingColumns.map((c: any) => c.name);

  async function addMeetingColumn(name: string, sql: string) {
    if (!meetingNames.includes(name)) {
      console.log(`Adding column to meetings: ${name}`);
      await db.execute(sql);
    }
  }

  await addMeetingColumn("meeting_type", "ALTER TABLE meetings ADD COLUMN meeting_type TEXT");
  await addMeetingColumn("start_time", "ALTER TABLE meetings ADD COLUMN start_time TEXT");
  await addMeetingColumn("end_time", "ALTER TABLE meetings ADD COLUMN end_time TEXT");
  await addMeetingColumn("location", "ALTER TABLE meetings ADD COLUMN location TEXT");
  await addMeetingColumn("organizer", "ALTER TABLE meetings ADD COLUMN organizer TEXT");
  await addMeetingColumn("description", "ALTER TABLE meetings ADD COLUMN description TEXT");
  await addMeetingColumn("agenda", "ALTER TABLE meetings ADD COLUMN agenda TEXT");
  await addMeetingColumn("status", "ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'Scheduled'");
  await addMeetingColumn("created_by", "ALTER TABLE meetings ADD COLUMN created_by TEXT");

  // Upgrade templates table
  const templateColumns = await db.select(`PRAGMA table_info(templates)`);
  const templateNames = templateColumns.map((c: any) => c.name);

  async function addTemplateColumn(name: string, sql: string) {
    if (!templateNames.includes(name)) {
      console.log(`Adding column to templates: ${name}`);
      await db.execute(sql);
    }
  }

  await addTemplateColumn("icon", "ALTER TABLE templates ADD COLUMN icon TEXT");
  await addTemplateColumn("version", "ALTER TABLE templates ADD COLUMN version INTEGER DEFAULT 1");

  // Upgrade messages table - ADD template_id
  const messageColumns = await db.select(`PRAGMA table_info(messages)`);
  const messageNames = messageColumns.map((c: any) => c.name);

  async function addMessageColumn(name: string, sql: string) {
  if (!messageNames.includes(name)) {
    console.log(`Adding column to messages: ${name}`);
    try {
      await db.execute(sql);
    } catch (e: any) {
      console.log(`Skip ${name}:`, e.message);
    }
  }
}

  await addMessageColumn("type", "ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'");
  await addMessageColumn("template_id", "ALTER TABLE messages ADD COLUMN template_id INTEGER");

  console.log("✅ Database schema created successfully");
}