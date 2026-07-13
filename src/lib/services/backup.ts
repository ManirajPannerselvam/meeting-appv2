import Database from "@tauri-apps/plugin-sql";

/**
 * Export backup data from all tables
 */
export async function exportBackup() {
  const db = await Database.load("sqlite:meeting.db");

  const meetings = await db.select("SELECT * FROM meetings");
  const users = await db.select("SELECT * FROM users");
  const actions = await db.select("SELECT * FROM action_items");
  const attendance = await db.select("SELECT * FROM attendance");

  const backupData = {
    meetings,
    users,
    actions,
    attendance,
    backupDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meeting_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import backup data into database
 */
export async function importBackup(backupData: any) {
  const db = await Database.load("sqlite:meeting.db");

  await db.execute("DELETE FROM meetings");
  await db.execute("DELETE FROM users");
  await db.execute("DELETE FROM action_items");
  await db.execute("DELETE FROM attendance");

  for (const meeting of backupData.meetings) {
    await db.execute(
      `INSERT INTO meetings
      (title, agenda, meeting_type, meeting_date, start_time, end_time, participants)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        meeting.title,
        meeting.agenda,
        meeting.meeting_type,
        meeting.meeting_date,
        meeting.start_time,
        meeting.end_time,
        meeting.participants
      ]
    );
  }

  for (const user of backupData.users) {
    await db.execute(
      `INSERT INTO users (username, password, role)
       VALUES (?, ?, ?)`,
      [user.username, user.password, user.role]
    );
  }

  alert("Backup Restored Successfully");
}

/**
 * Analytics summary
 */
export async function getAnalytics() {
  const db = await Database.load("sqlite:meeting.db");

  const meetings = await db.select("SELECT COUNT(*) as count FROM meetings");
  const users = await db.select("SELECT COUNT(*) as count FROM users");
  const actions = await db.select("SELECT COUNT(*) as count FROM action_items");
  const attendance = await db.select("SELECT COUNT(*) as count FROM attendance");

  return {
    totalMeetings: meetings[0]?.count ?? 0,
    totalContacts: users[0]?.count ?? 0,
    totalGroups: actions[0]?.count ?? 0,
    totalMessages: attendance[0]?.count ?? 0
  };
}
