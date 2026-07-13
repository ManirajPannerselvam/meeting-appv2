import db from "$lib/server/db";

export const GET = async () => {
  const rows = db.prepare(`
    SELECT
      g.id,
      g.name,
      MAX(m.created_at) as last_time,
      (
        SELECT message
        FROM messages x
        WHERE x.group_id = g.id
        ORDER BY x.id DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*) FROM messages y WHERE y.group_id = g.id AND (y.read IS NULL OR y.read = 0)
      ) as unread_count
    FROM chat_groups g
    LEFT JOIN messages m
      ON g.id = m.group_id
    GROUP BY g.id
    ORDER BY last_time DESC
  `).all();

  return Response.json({
    chats: rows
  });
};