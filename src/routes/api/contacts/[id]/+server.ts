import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function DELETE({ params }) {
  const id = Number(params.id);

  db.prepare(`
    DELETE FROM contacts
    WHERE id = ?
  `).run(id);

  return json({
    success: true
  });
}