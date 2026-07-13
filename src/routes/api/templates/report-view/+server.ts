import { json } from "@sveltejs/kit";
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const reportId = url.searchParams.get("id");

    if (!reportId) {
        return json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    try {
        console.log('Fetching report:', reportId);

        // 1. Get report + template info
        const { data: report, error: reportError } = await supabase
           .from('template_reports')
           .select(`
                id,
                template_id,
                sender,
                values_json,
                created_at,
                templates (
                    name,
                    icon,
                    department,
                    version,
                    category
                )
            `)
           .eq('id', reportId)
           .single();

        if (reportError ||!report) {
            return json({ success: false, error: 'Report not found' }, { status: 404 });
        }

        const template = report.templates as any;
        console.log('Report found:', template?.name);

        // 2. Parse values_json
        let values: Record<string, any> = {};
        try {
            values = JSON.parse(report.values_json || '{}');
        } catch (e) {
            console.error('JSON parse error:', e);
            values = {};
        }

        // 3. Get template fields
        let fields: any[] = [];
        try {
            const { data: fieldsData, error: fieldsError } = await supabase
               .from('template_fields')
               .select('field_name, field_label, field_type, display_order')
               .eq('template_id', report.template_id)
               .order('display_order', { ascending: true });

            if (fieldsError) throw fieldsError;
            fields = fieldsData || [];

            console.log('Fields found:', fields.length);

            // Fallback: if no fields defined, build from values_json keys
            if (fields.length === 0 && Object.keys(values).length > 0) {
                console.log('No template_fields found, building from values_json');
                fields = Object.keys(values).map((key, idx) => ({
                    field_name: key,
                    field_label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    field_type: typeof values[key] === 'number'? 'number' : 'text',
                    display_order: idx
                }));
            }
        } catch (e: any) {
            console.error('Fields query error:', e.message);
            fields = [];
        }

        // 4. Merge fields with values
        const fieldsWithValues = fields.map((f: any) => ({
            name: f.field_name,
            label: f.field_label || f.field_name,
            type: f.field_type,
            value: values[f.field_name]?? '',
            order: f.display_order
        }));

        // 5. Return response
        return json({
            success: true,
            data: {
                id: report.id,
                template_id: report.template_id,
                template_name: template?.name,
                icon: template?.icon,
                department: template?.department,
                category: template?.category,
                version: template?.version,
                sender: report.sender,
                created_at: report.created_at,
                fields: fieldsWithValues,
                values: values
            }
        });

    } catch (err: any) {
        console.error('report-view FULL ERROR:', err);
        return json({
            success: false,
            error: 'Server error',
            details: err.message
        }, { status: 500 });
    }
};