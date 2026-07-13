import { json } from "@sveltejs/kit";
import db from "$lib/server/db";
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export const POST = async ({ params, request }) => {
  try {
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    let user: any = null;
    try { user = jwt.verify(token, env.JWT_SECRET); } catch (e) { return json({ success: false, message: 'Invalid token' }, { status: 401 }); }

    const groupId = Number(params.id);
    const data = await request.json();
    const memberMobile = data.member;
    if (!memberMobile) return json({ success: false, message: 'Member required' }, { status: 400 });

    // validate group
    const grp = db.prepare('SELECT id FROM chat_groups WHERE id = ?').get(groupId);
    if (!grp) return json({ success: false, message: 'Invalid group' }, { status: 400 });

    // only admins can add members
    const isAdmin = db.prepare('SELECT id FROM group_admins WHERE group_id = ? AND admin = ?').get(groupId, user.mobile || user.user);
    if (!isAdmin) return json({ success: false, message: 'Only admins can add members' }, { status: 403 });

    // add member if not exists
    const exists = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND member = ?').get(groupId, memberMobile);
    if (!exists) {
      db.prepare('INSERT INTO group_members (group_id, member) VALUES (?,?)').run(groupId, memberMobile);
    }

    return json({ success: true });
  } catch (err) {
    console.error('add member failed', err);
    return json({ success: false }, { status: 500 });
  }
};

export const DELETE = async ({ params, request }) => {
  try {
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    let user: any = null;
    try { user = jwt.verify(token, env.JWT_SECRET); } catch (e) { return json({ success: false, message: 'Invalid token' }, { status: 401 }); }

    const groupId = Number(params.id);
    const data = await request.json();
    const memberMobile = data.member;

    if (!memberMobile) return json({ success: false, message: 'Member required' }, { status: 400 });

    // only admins can remove members
    const isAdminRem = db.prepare('SELECT id FROM group_admins WHERE group_id = ? AND admin = ?').get(groupId, user.mobile || user.user);
    if (!isAdminRem) return json({ success: false, message: 'Only admins can remove members' }, { status: 403 });

    db.prepare('DELETE FROM group_members WHERE group_id = ? AND member = ?').run(groupId, memberMobile);

    return json({ success: true });
  } catch (err) {
    console.error('remove member failed', err);
    return json({ success: false }, { status: 500 });
  }
};