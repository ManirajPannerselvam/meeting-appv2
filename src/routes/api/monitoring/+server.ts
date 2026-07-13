import { json } from "@sveltejs/kit";
import monitor from "$lib/server/monitoring";
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export const GET = async ({ request }) => {
  try {
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    let user: any = null;
    try { user = jwt.verify(token, env.JWT_SECRET); } catch (e) { return json({ success: false, message: 'Invalid token' }, { status: 401 }); }

    // optionally check admin role etc. For now, return metrics to authenticated users
    monitor.sampleSystem();
    return json({ success: true, metrics: monitor.getMetrics() });
  } catch (e) {
    console.error('monitoring get failed', e);
    return json({ success: false }, { status: 500 });
  }
};
