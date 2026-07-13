import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

/* GET */
export const GET = async () => {
  try {
    const rows = db.prepare(
      "SELECT * FROM meetings ORDER BY id DESC"
    ).all();

    // Map rows to include compatibility fields 'date' and 'type'
    const meetings = rows.map((m: any) => ({
      ...m,
      date: m.meeting_date,
      type: m.meeting_type
    }));

    return json({ meetings });
  } catch (err) {
    console.error(err);
    return json({ meetings: [] }, { status: 500 });
  }
};

/* POST */
export const POST = async ({ request }) => {
  try {
    const body = await request.json();

    // Accept both shapes: { date, type } or { meeting_date, meeting_type }
    const title = body.title || body.name || "";
    const agenda = body.agenda || "";
    const meeting_date = body.meeting_date || body.date || null;
    const meeting_type = body.meeting_type || body.type || null;
    const location = body.location || null;

    const stmt = db.prepare(`
      INSERT INTO meetings (title, agenda, meeting_date, meeting_type, location)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(title, agenda, meeting_date, meeting_type, location);

    return json({ success: true });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    return json({ success: false }, { status: 500 });
  }
};