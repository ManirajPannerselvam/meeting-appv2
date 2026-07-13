import db from "$lib/server/db";

export const GET = async () => {
  const contacts = db.prepare(`
    SELECT * FROM contacts
    ORDER BY name
  `).all();

  return Response.json({ contacts });
};

export const POST = async ({ request }) => {
  const data = await request.json();

  db.prepare(`
    INSERT INTO contacts
    (name,mobile,department)
    VALUES (?,?,?)
  `).run(
    data.name,
    data.mobile,
    data.department
  );

  return Response.json({ success: true });
};