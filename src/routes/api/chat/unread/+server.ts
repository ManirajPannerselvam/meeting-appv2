import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function GET({ request }) {
  try {
    // ✅ JWT ல இருந்து userId எடுங்க
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return json({ success: false, count: 0, error: 'No token' });
    }

    // ✅ JWT decode பண்ணி userId எடுங்க
    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId || payload.sub;
    } catch (e) {
      return json({ success: false, count: 0, error: 'Invalid token' });
    }

    // ✅ UUID validate பண்ணுங்க
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return json({ success: false, count: 0, error: 'Invalid userId' });
    }

    // ✅ Unread count எடுங்க
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!rooms || rooms.length === 0) {
      return json({ success: true, count: 0 });
    }

    const roomIds = rooms.map(r => r.id);

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('room_id', roomIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;

    return json({ success: true, count: count || 0 });
    
  } catch (err) {
    console.error('Unread API error:', err);
    return json({ success: false, count: 0 });
  }
}