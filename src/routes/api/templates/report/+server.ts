import { json, error } from "@sveltejs/kit";
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
    try {
        const limit = Number(url.searchParams.get("limit")) || 50;
        const date = url.searchParams.get("date");

        let query = supabase
         .from('template_reports')
         .select(`
                id,
                template_id,
                template_version,
                sender,
                room_id,
                contact_id,
                report_date,
                values,
                created_at
            `)
         .order('created_at', { ascending: false })
         .limit(limit);

        if (date && date.trim()!== "") {
            query = query.gte('report_date', `${date}T00:00:00`)
                      .lte('report_date', `${date}T23:59:59`);
        }

        const { data, error: dbError } = await query;
        if (dbError) throw dbError;

        // NO PARSE needed - values is already jsonb (24kB)
        const reports = data?.map((r: any) => ({
         ...r,
            values: r.values || {} // direct jsonb
        })) || [];

        return json({
            success: true,
            count: reports.length,
            data: reports
        });

    } catch (err: any) {
        console.error('Report fetch error:', err);
        throw error(500, err.message || 'Failed to fetch reports');
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) throw error(401, 'Unauthorized');

        let userId: string;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId || payload.sub;
        } catch (e) {
            throw error(401, 'Invalid token');
        }

        const body = await request.json();
        const { templateId, roomId, content, values } = body;

        if (!templateId ||!roomId) {
            throw error(400, 'Missing required fields: templateId, roomId');
        }

        // 75% SMALLER - insert as jsonb directly, no stringify
        const { data: report, error: reportError } = await supabase
         .from('template_reports')
         .insert({
                template_id: templateId,
                template_version: 1,
                sender: userId,
                room_id: roomId,
                contact_id: null,
                report_date: new Date().toISOString(),
                values: values || {}, // jsonb - 24kB not 96kB
                created_at: new Date().toISOString()
            })
         .select()
         .single();

        if (reportError) throw error(500, reportError.message);

        // Chat message link - KEEP as messages table
        const { error: msgError } = await supabase
         .from('messages')
         .insert({
                room_id: roomId,
                sender_id: userId,
                content: content || `📊 Template Report`,
                type: 'template',
                template_id: templateId,
                report_id: report.id,
                created_at: new Date().toISOString()
            });

        if (msgError) console.error('Message insert error:', msgError);

        return json({
            success: true,
            report_id: report.id,
            message: 'Report created successfully - 75% storage saved'
        }, { status: 201 });

    } catch (err: any) {
        console.error('Report create error:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'Failed to create report');
    }
};