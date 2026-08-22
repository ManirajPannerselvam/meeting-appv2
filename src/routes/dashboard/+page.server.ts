import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Use the same supabase client that has the user's cookies
	const { supabase } = locals;

	const [meetings, actions, downtime, production] = await Promise.all([
		supabase.from('meetings').select('*').order('meeting_date', { ascending: true }),
		supabase.from('meeting_actions').select('*').order('created_at', { ascending: false }),
		supabase.from('machine_downtime').select('*').order('report_date', { ascending: false }),
		supabase.from('records').select('*').order('ts', { ascending: false })
	]);

	return {
		meetings: meetings.data?? [],
		actions: actions.data?? [],
		downtime: downtime.data?? [],
		production: production.data?? [],
		user: locals.user
	};
};