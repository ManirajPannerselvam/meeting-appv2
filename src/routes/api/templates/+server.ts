import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import {
    VITE_SUPABASE_TEMPLATES_URL,
    SUPABASE_TEMPLATES_SERVICE_KEY
} from '$env/static/private';

// TODO: Move to.env - ROTATE THIS KEY NOW
// const url = 'https://rfckntoqyomqhrkwejrx.supabase.co'
// const serviceKey = 'eyJhbGciOi...'

const supabase = createClient(
    VITE_SUPABASE_TEMPLATES_URL,
    SUPABASE_TEMPLATES_SERVICE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

function normalizeTemplate(template: any) {
    if (!template) return template;
    if (typeof template.data === 'string') {
        try {
            template.data = JSON.parse(template.data);
        } catch {
            template.data = {};
        }
    }
    template.data??= {};
    template.data.fields??= [];
    return template;
}

export async function GET() {
    try {
        const { data, error } = await supabase
           .from('templates')
           .select('*')
           .order('created_at', { ascending: false });

        if (error) throw error;

        const normalized = (data?? []).map(normalizeTemplate);

        // DEBUG: Check if last_values is coming from DB
        console.log("GET TEMPLATE");
        console.log(JSON.stringify(normalized, null, 2));

        return json({
            success: true,
            templates: normalized
        });

    } catch (err: any) {
        console.error(err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST({ request }) {
    try {
        const body = await request.json();

        if (!body.template_code?.trim()) {
            return json({ success: false, error: 'Template Code is required.' }, { status: 400 });
        }
        if (!body.name?.trim()) {
            return json({ success: false, error: 'Template Name is required.' }, { status: 400 });
        }

        const payload = {
            template_code: body.template_code.trim().toUpperCase(),
            name: body.name.trim(),
            description: body.description?? '',
            category: body.category?? 'General',
            data: body.data?? { fields: [] }
        };

        const { data, error } = await supabase
           .from('templates')
           .insert([payload])
           .select()
           .single();

        if (error) {
            if (error.code === '23505') {
                return json({ success: false, error: 'Template Code already exists.' }, { status: 409 });
            }
            throw error;
        }

        return json({ success: true, template: normalizeTemplate(data) });

    } catch (err: any) {
        console.error(err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
}

// FIX: MERGE instead of overwrite
export async function PUT({ request }) {
    try {
        const body = await request.json();

        // 1. Read existing data first so we don't lose last_values, version, chart etc
        const { data: existing, error: readError } = await supabase
           .from("templates")
           .select("data")
           .eq("id", body.id)
           .single();

        if (readError) throw readError;

        // 2. Merge: keep everything from old data, only overwrite department + fields
        const mergedData = {
           ...(existing?.data || {}),
            department: body.department?? existing?.data?.department,
            fields: body.fields?? existing?.data?.fields
        };

        const { data, error } = await supabase
           .from("templates")
           .update({
                name: body.name,
                template_code: body.template_code,
                description: body.description,
                data: mergedData,
                updated_at: new Date().toISOString()
            })
           .eq("id", body.id)
           .select()
           .single();

        if (error) throw error;

        return json({
            success: true,
            template: normalizeTemplate(data)
        });

    } catch (err: any) {
        console.error("PUT ERROR:", err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE({ url }) {
    try {
        const id = url.searchParams.get('id');
        if (!id) {
            return json({ success: false, error: 'Template id is required.' }, { status: 400 });
        }

        const { error } = await supabase
           .from('templates')
           .delete()
           .eq('id', id);

        if (error) throw error;

        return json({ success: true });

    } catch (err: any) {
        console.error(err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
}