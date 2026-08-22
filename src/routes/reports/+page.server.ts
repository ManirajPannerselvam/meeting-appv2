import { fail } from '@sveltejs/kit';
import { getSupabaseServer } from '$lib/supabase/server';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  const { supabase } = getSupabaseServer(event);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { templates: [], records: [], user: null };

  // 1. Load templates - everyone can read
  const { data: templates } = await supabase.from('templates').select('*').order('name');

  // 2. Load records - ONLY for this user
  const { data: records } = await supabase
   .from('records')
   .select('*')
   .eq('user_id', user.id) // CRITICAL: user based
   .order('ts', { ascending: false });

  return { templates: templates || [], records: records || [], user };
};

export const actions: Actions = {
  loadRecords: async (event) => {
    const { request } = event;
    const formData = await request.formData();
    const t_code = formData.get('t_code') as string;
    const shift = formData.get('shift') as string;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;
    const stations = formData.getAll('stations') as string[];

    const { supabase } = getSupabaseServer(event);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail(401, { error: 'Not logged in' });

    let query = supabase
     .from("records")
     .select("*")
     .eq("user_id", user.id) // 1. Lock to user first
     .eq("t_code", t_code)
     .ilike("shift", shift)
     .gte("ts", start)
     .lte("ts", end);

    if (stations.length > 0) {
      query = query.in("station", stations);
    }

    const { data, error } = await query.order("ts");
    if (error) return fail(400, { error: error.message });

    return { records: data };
  }
};