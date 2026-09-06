import { json } from '@sveltejs/kit';
import { supabaseTemplates } from '$lib/supabase';
const supabase = supabaseTemplates;

export async function POST({ request }: any) {
  try {
    const { share_id, approver_id, action, new_role } = await request.json(); // action = approved | rejected

    if (!share_id || !approver_id || !action) return json({ error: 'Missing' }, { status: 400 });

    const { data: share } = await supabase.from('template_shares').select('*').eq('id', share_id).single();
    if (!share) return json({ error: 'Share not found' }, { status: 404 });

    const { data: tmpl } = await supabase.from('templates').select('id, owner_id, main_owner_id, owner_chain').eq('id', share.template_id).single();
    if (!tmpl) return json({ error: 'Template not found' }, { status: 404 });

    const mainOwnerId = tmpl.main_owner_id || tmpl.owner_id;
    if (approver_id !== mainOwnerId) {
      return json({ error: 'Only Main Owner can approve' }, { status: 403 });
    }

    // Update share status
    const { error: updErr } = await supabase.from('template_shares').update({
      status: action,
      role: new_role || share.role
    }).eq('id', share_id);

    if (updErr) throw updErr;

    if (action === 'approved') {
      let chain = Array.isArray(tmpl.owner_chain) ? tmpl.owner_chain : [];
      chain = chain.filter((c: any) => c.email !== share.to_email);
      chain.push({
        email: share.to_email,
        user_id: share.to_user_id,
        role: new_role || share.role, // main owner can upgrade to indirect_owner / editor
        level: share.level,
        approved_at: new Date().toISOString(),
        approved_by: approver_id
      });

      await supabase.from('templates').update({ owner_chain: chain }).eq('id', tmpl.id);
    }

    return json({ ok: true, message: `Share ${action}` });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}

export async function GET({ url }: any) {
  // Get pending approvals for main owner
  const owner_id = url.searchParams.get('owner_id');
  if (!owner_id) return json({ pending: [] });

  // Get all templates owned by this user
  const { data: myTemplates } = await supabase.from('templates').select('id').or(`owner_id.eq.${owner_id},main_owner_id.eq.${owner_id}`);
  const ids = (myTemplates || []).map((t: any) => t.id);
  if (!ids.length) return json({ pending: [] });

  const { data } = await supabase.from('template_shares').select('*, templates(name, template_code)').in('template_id', ids).eq('status', 'pending').order('created_at', { ascending: false });
  return json({ pending: data || [] });
}