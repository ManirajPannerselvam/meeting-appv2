import { initDB } from "$lib/services/database";

export async function saveMeeting(meeting: {
  title: string;
  meetingDate?: string;
  meetingType?: string;
  agenda?: string;
}) {
  const db = await initDB();

  const existing = await db.select(
    `SELECT id
     FROM meetings
     WHERE title = ?
     AND meeting_date = ?
     AND meeting_type = ?
     AND agenda = ?`,
    [
      meeting.title,
      meeting.meetingDate || "",
      meeting.meetingType || "",
      meeting.agenda || ""
    ]
  );

  console.log("EXISTING:", existing);

  if (existing.length > 0) {
    console.log("Meeting already exists");
    return;
  }

  await db.execute(
    `INSERT INTO meetings
    (title, meeting_date, meeting_type, agenda)
    VALUES (?, ?, ?, ?)`,
    [
      meeting.title,
      meeting.meetingDate || "",
      meeting.meetingType || "",
      meeting.agenda || ""
    ]
  );

  const verify = await db.select(
    "SELECT * FROM meetings ORDER BY id DESC"
  );

  console.log("AFTER INSERT:", verify);

  console.log("Meeting saved");
}

export async function getMeetings() {
  const db = await initDB();

  const data = await db.select(
    "SELECT * FROM meetings ORDER BY id DESC"
  );

  console.log("GET MEETINGS:", data);

  return data;
}