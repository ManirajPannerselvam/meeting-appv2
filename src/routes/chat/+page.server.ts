import type { PageServerLoad } from './$types';
import { getSupabaseServer } from '$lib/supabase/server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { supabase } = getSupabaseServer(event);

	// Secure - use getUser() on server
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		throw redirect(303, '/login');
	}

	// Fetch groups user belongs to (real table)
	const { data: memberRows, error: groupError } = await supabase
		.from('chat_group_members')
		.select('chat_groups(id,name,description,avatar_url)')
		.eq('user_id', user.id);

	if (groupError) {
		console.error('Group fetch error:', groupError);
	}

	const groups = (memberRows ?? [])
		.map((m: any) => m.chat_groups)
		.filter(Boolean);

	// Fetch rooms for sidebar (optional, client also loads)
	const { data: rooms } = await supabase
		.from('rooms')
		.select('id, user1_id, user2_id')
		.or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
		.limit(50);

	return {
		user,
		groups,
		rooms: rooms ?? [],
		chats: [] // keep empty for backward compat - don't query non-existent table
	};
};