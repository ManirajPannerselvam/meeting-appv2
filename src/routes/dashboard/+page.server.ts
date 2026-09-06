import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) throw new Error('Not logged in');

  const supabase = locals.supabase;
  const uid = user.id;
  const email = user.email;

  // ONLY user's data - not all
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .or(`created_by.eq.${uid},participants.cs.{${email}},owner_email.eq.${email}`)
    .order('meeting_date', { ascending: false })
    .limit(50);

  const { data: actions } = await supabase
    .from('meeting_actions')
    .select('*')
    .or(`assigned_to.eq.${uid},assigned_email.eq.${email},created_by.eq.${uid}`)
    .order('due_date', { ascending: true })
    .limit(50);

  const { data: production } = await supabase
    .from('production_reports')
    .select('*')
    .eq('created_by', uid)
    .order('report_date', { ascending: false })
    .limit(20);

  const { data: downtime } = await supabase
    .from('downtime_reports')
    .select('*')
    .eq('created_by', uid)
    .order('report_date', { ascending: false })
    .limit(20);

  return {
    user,
    meetings: meetings ?? [],
    actions: actions ?? [],
    production: production ?? [],
    downtime: downtime ?? []
  };
};