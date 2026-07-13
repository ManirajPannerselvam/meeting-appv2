import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export const GET = async () => {
  try {
    // 1. Get all groups
    const { data: groups, error: groupsErr } = await supabase
      .from('chat_groups')
      .select('id, name');

    if (groupsErr) throw groupsErr;

    // 2. For each group, get last message + unread count
    const chats = await Promise.all(
      groups.map(async (g) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('group_id', g.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: unread_count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .or('read.is.null,read.eq.false');

        return {
          id: g.id,
          name: g.name,
          last_time: lastMsg?.created_at || null,
          last_message: lastMsg?.content || null,
          unread_count: unread_count || 0
        };
      })
    );

    // Sort by last_time desc
    chats.sort((a, b) => {
      if (!a.last_time) return 1;
      if (!b.last_time) return -1;
      return new Date(b.last_time).getTime() - new Date(a.last_time).getTime();
    });

    return json({ chats });
  } catch (err: any) {
    console.error('recent_chats error:', err);
    return new Response(err.message || 'Server error', { status: 500 });
  }
};