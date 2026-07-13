import { json } from "@sveltejs/kit";
import db from "$lib/server/db";
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export const GET = async () => {
  const groups = db.prepare(`
    SELECT g.*, (
      SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id
    ) as member_count
    FROM chat_groups g
    ORDER BY id DESC
  `).all();

  return Response.json({ groups });
};

export const POST = async ({ request }) => {
  try {
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    let user: any = null;
    if (token) {
      try { user = jwt.verify(token, env.JWT_SECRET); } catch (e) { user = null; }
    }

    const data = await request.json();

    const info = db.prepare(`
      INSERT INTO chat_groups (name,description) VALUES (?,?)
    `).run(data.name, data.description);

    const groupId = info.lastInsertRowid || null;

    // if creator available, add as member and admin
    if (groupId && user && (user.mobile || user.user)) {
      const mobile = user.mobile || user.user;
      db.prepare('INSERT INTO group_members (group_id, member) VALUES (?,?)').run(groupId, mobile);
      db.prepare('INSERT INTO group_admins (group_id, admin) VALUES (?,?)').run(groupId, mobile);
    }

    return json({ success: true });
  } catch (err) {
    console.error('create group failed', err);
    return json({ success: false }, { status: 500 });
  }
};
