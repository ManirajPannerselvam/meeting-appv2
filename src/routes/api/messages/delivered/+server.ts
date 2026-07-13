import { json } from "@sveltejs/kit";
import db from "$lib/server/db";
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import broadcast from '$lib/server/ws-server';
import monitor from '$lib/server/monitoring';

export const POST = async ({ request }) => {
  try {
    const t0 = Date.now();
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    let user: any = null;
    try { user = jwt.verify(token, env.JWT_SECRET); } catch (e) { return json({ success: false, message: 'Invalid token' }, { status: 401 }); }

    const { id } = await request.json();
    if (!id) return json({ success: false, message: 'Invalid message id' }, { status: 400 });

    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!msg) return json({ success: false, message: 'Message not found' }, { status: 404 });

    // basic permission: sender cannot mark own message as delivered
    const sender = msg.sender;
    const mobile = user.mobile || user.user;
    if (sender === mobile) return json({ success: false, message: 'Cannot mark own message delivered' }, { status: 403 });

    // update per-user receipt
    db.prepare('UPDATE message_receipts SET delivered = 1, delivered_at = ? WHERE message_id = ? AND mobile = ?').run(new Date().toISOString(), id, mobile);

    // optionally mark message-level delivered flag if all recipients delivered
    try {
      const pending = db.prepare('SELECT COUNT(*) as c FROM message_receipts WHERE message_id = ? AND delivered = 0').get(id);
      if (pending && pending.c === 0) {
        db.prepare('UPDATE messages SET delivered = 1 WHERE id = ?').run(id);
      }
    } catch (e) {}

    // broadcast update for UI
    try { broadcast({ type: 'delivered', id, mobile, delivered: 1 }); } catch (e) {}

    monitor.recordApiTime('messages.delivered', Date.now() - t0);
    return json({ success: true });
  } catch (err) {
    console.error('delivered failed', err);
    return json({ success: false }, { status: 500 });
  }
};