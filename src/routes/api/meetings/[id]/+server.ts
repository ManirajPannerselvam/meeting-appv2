import { json } from "@sveltejs/kit";
import { initDB } from "$lib/server/database";

/* DELETE */
export async function DELETE({ params }) {
  const db = await initDB();

  await db.execute(
    "DELETE FROM meetings WHERE id = ?",
    [params.id]
  );

  return json({ success: true });
}

/* UPDATE */
export async function PUT({ params, request }) {
  const db = await initDB();

  const { title, date, type, agenda, location } =
    await request.json();

  await db.execute(
    `UPDATE meetings 
     SET title=?, date=?, type=?, agenda=?, location=?
     WHERE id=?`,
    [title, date, type, agenda, location, params.id]
  );

  return json({ success: true });
}