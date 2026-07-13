import { json } from "@sveltejs/kit";
import db from "$lib/server/db";
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export async function DELETE({ params, request }) {
  try {
    const id = Number(params.id);

    if (!id) {
      return json(
        {
          success: false,
          message: "Invalid Group ID"
        },
        { status: 400 }
      );
    }

    // Authorization: only group admins can delete
    const authHeader = request?.headers?.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    
    let user: any = null;
    try { 
      user = jwt.verify(token, env.JWT_SECRET); 
    } catch (e) { 
      return json({ success: false, message: 'Invalid token' }, { status: 401 }); 
    }

    const isAdmin = db.prepare('SELECT id FROM group_admins WHERE group_id = ? AND admin = ?').get(id, user.mobile || user.user);
    if (!isAdmin) return json({ success: false, message: 'Only admins can delete group' }, { status: 403 });

    // Delete messages belonging to group
    db.prepare(`
      DELETE FROM messages
      WHERE group_id = ?
    `).run(id);

    // Delete group and related membership/admin entries
    db.prepare(`
      DELETE FROM group_members
      WHERE group_id = ?
    `).run(id);
    
    db.prepare(`
      DELETE FROM group_admins
      WHERE group_id = ?
    `).run(id);
    
    db.prepare(`
      DELETE FROM chat_groups
      WHERE id = ?
    `).run(id);

    return json({
      success: true,
      message: "Group deleted"
    });

  } catch (error) {
    console.error(error);
    return json(
      {
        success: false,
        message: "Delete failed"
      },
      { status: 500 }
    );
  }
} // <- This closing brace was missing

export async function PUT({ params, request }) {
  try {
    const id = Number(params.id);
    const authHeader = request?.headers?.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    
    let user: any = null;
    try { 
      user = jwt.verify(token, env.JWT_SECRET); 
    } catch (e) { 
      return json({ success: false, message: 'Invalid token' }, { status: 401 }); 
    }

    const isAdmin = db.prepare('SELECT id FROM group_admins WHERE group_id = ? AND admin = ?').get(id, user.mobile || user.user);
    if (!isAdmin) return json({ success: false, message: 'Only admins can modify group' }, { status: 403 });

    const data = await request.json();
    if (data.name) db.prepare('UPDATE chat_groups SET name = ? WHERE id = ?').run(data.name, id);
    if (data.description) db.prepare('UPDATE chat_groups SET description = ? WHERE id = ?').run(data.description, id);

    return json({ success: true });
  } catch (err) {
    console.error('update group failed', err);
    return json({ success: false }, { status: 500 });
  }
}