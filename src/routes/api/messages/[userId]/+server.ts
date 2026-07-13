import { json, error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

function getUserFromToken(request: Request) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) throw error(401, 'Unauthorized');

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { userId: payload.userId };
    } catch (e) {
        throw error(401, 'Invalid token');
    }
}

function getRoomId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `chat_${sorted[0]}_${sorted[1]}`;
}

export async function GET({ params, request }) {
    try {
        const { userId: currentUserId } = getUserFromToken(request);
        const { userId: otherUserId } = params;
        const roomId = getRoomId(currentUserId, otherUserId);

        console.log('Fetching room:', roomId);

        const { data: messages, error: fetchError } = await supabase
       .from('messages')
       .select('*')
       .eq('room_id', roomId)
       .order('created_at', { ascending: true });

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            throw error(500, fetchError.message);
        }

        console.log('Found:', messages?.length);
        return json({ success: true, data: messages || [] });

    } catch (err: any) {
        console.error('Get error:', err);
        if (err.status) throw err;
        throw error(500, err.message);
    }
}