import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function POST({ request }) {
    const { ids } = await request.json();
    if (!ids?.length) return json({});
    
    const { data } = await supabase
        .from('template_reports')
        .select('*')
        .in('id', ids);
    
    const map = {};
    data?.forEach(r => map[r.id] = r);
    return json(map);
}