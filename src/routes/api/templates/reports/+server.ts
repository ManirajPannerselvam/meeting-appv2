import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ url, request }) {
    try {
        const date = url.searchParams.get('date');
        if (!date) return json({ error: 'date param required' }, { status: 400 });

        // Get user from JWT
        const authHeader = request.headers.get('authorization');
        if (!authHeader) return json({ error: 'No auth' }, { status: 401 });

        const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data, error } = await supabase
            .from('template_reports')
            .select('*')
            .gte('created_at', `${date}T00:00:00Z`)
            .lte('created_at', `${date}T23:59:59Z`);

        if (error) {
            console.error('Supabase error:', error);
            return json({ error: error.message }, { status: 500 });
        }

        return json(data || []);
    } catch (e: any) {
        console.error('Route error:', e);
        return json({ error: e.message }, { status: 500 });
    }
}