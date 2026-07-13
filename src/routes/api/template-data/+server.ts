import db from "$lib/server/db";

export const POST = async ({ request }) => {

  const body = await request.json();

  db.prepare(`
    INSERT INTO template_data
    (
      template_id,
      data_json,
      created_by
    )
    VALUES (?, ?, ?)
  `).run(
    body.template_id,
    JSON.stringify(body.data),
    "Admin"
  );

  return Response.json({
    success: true
  });
};

export const GET = async () => {

  const data = db.prepare(`
    SELECT *
    FROM template_data
    ORDER BY id DESC
  `).all();

  return Response.json({
    records: data
  });
};