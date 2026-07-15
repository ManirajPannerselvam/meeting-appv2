import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

const url = 'https://rfckntoqyomqhrkwejrx.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmY2tudG9xeW9tcWhya3dlanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU1MTE5MSwiZXhwIjoyMTAwMTI3MTkxfQ.6fmknSd05HwdIAEPum6Qp7NKuiYkS0fXwqoNKj9VRhA'

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

export async function DELETE({ params }) {
    const { id } = params;
    const { error } = await supabase.from('templates').delete().eq('id', id);
    
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ success: true });
}