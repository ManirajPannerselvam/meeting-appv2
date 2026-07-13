import { json, error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

function getUserFromToken(request: Request) {
    const auth = request.headers.get('authorization');

    if (!auth?.startsWith('Bearer ')) {
        throw error(401, 'Unauthorized');
    }

    const token = auth.substring(7);

    try {
        const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString('utf8')
        );

        if (!payload.userId) {
            throw error(401, 'Invalid token');
        }

        return {
            userId: payload.userId
        };
    } catch {
        throw error(401, 'Invalid token');
    }
}

export async function POST({ request }) {
    try {
        const { userId: senderId } = getUserFromToken(request);

        const {
            roomId,
            receiverId,
            message
        } = await request.json();

        if (!roomId || !receiverId || !message?.trim()) {
            throw error(
                400,
                'roomId, receiverId and message are required.'
            );
        }

        // Verify receiver exists
        const { data: receiver } = await supabase
            .from('users')
            .select('id')
            .eq('id', receiverId)
            .maybeSingle();

        if (!receiver) {
            throw error(404, 'Receiver not found.');
        }

        const { data: insertedMessage, error: insertError } = await supabase
            .from('messages')
            .insert({
                room_id: roomId,
                sender_id: senderId,
                receiver_id: receiverId,
                content: message.trim(),
                event: 'message',
                private: true,
                extension: 'chat'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert Error:', insertError);
            throw error(500, insertError.message);
        }

        const { data: sender } = await supabase
            .from('users')
            .select('id, name, mobile')
            .eq('id', senderId)
            .maybeSingle();

        return json({
            success: true,
            data: {
                ...insertedMessage,
                users: sender,
                is_own: true
            }
        });

    } catch (err: any) {
        console.error('========== SEND MESSAGE ERROR ==========');
        console.error(err);

        if (err.status) {
            throw err;
        }

        throw error(500, err.message || 'Internal Server Error');
    }
}