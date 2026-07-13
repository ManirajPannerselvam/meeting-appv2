import db from "$lib/server/db";

export const GET = async ({ url }) => {

  const cols = db.prepare(
    "PRAGMA table_info(messages)"
  ).all();

  console.log("MESSAGES TABLE:", cols);

  const groupId = url.searchParams.get("groupId");
  const contactId = url.searchParams.get("contactId");

  let messages: any[] = [];

  if (groupId) {

    messages = db.prepare(`
      SELECT
        id,
        group_id,
        contact_id,
        sender,
        message,
        type,
        created_at,
        delivered,
        read
      FROM messages
      WHERE group_id = ?
      ORDER BY created_at ASC
    `).all(groupId);

  } else if (contactId) {

    messages = db.prepare(`
      SELECT
        id,
        group_id,
        contact_id,
        sender,
        message,
        type,
        created_at,
        delivered,
        read
      FROM messages
      WHERE contact_id = ?
      ORDER BY created_at ASC
    `).all(contactId);

  }

  return Response.json({ messages });
};