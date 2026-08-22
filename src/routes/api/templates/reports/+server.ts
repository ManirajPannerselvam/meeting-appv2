/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/api/templates/reports/+server.ts
 * ============================================================
 * PURPOSE
 * Bulk fetch template reports by ids
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

type Report = {
    id: string | number;
    [key: string]: unknown;
}

export async function POST({ request }: RequestEvent) {
    try {
        const { ids } = await request.json() as { ids: (string | number)[] };

        if (!ids?.length) {
            return json({ success: true, data: {} });
        }
        
        const { data, error } = await supabase
            .from('template_reports')
            .select('*')
            .in('id', ids);

        if (error) throw error;
        
        const map: Record<string | number, Report> = {};
        data?.forEach(r => { 
            map[r.id] = r 
        });

        return json({ success: true, data: map });

    } catch (error) {
        console.error('[Template Reports API] Error:', error);
        return json(
            { success: false, error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}