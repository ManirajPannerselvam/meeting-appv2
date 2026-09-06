import { json } from '@sveltejs/kit';
import { supabaseTemplates, getChatClient } from '$lib/supabase';
const supabase = supabaseTemplates;
const chatDB = getChatClient();

export async function POST({ request }: any) {
  try {
    const body = await request.json();
    const { template_id, template_code, from_user_id, from_email, to_email, role } = body;

    if (!template_id || !to_email || !from_user_id) {
      return json({ error: 'Missing fields' }, { status: 400 });
    }

    const cleanToEmail = to_email.trim().toLowerCase();
    const cleanRole = role || 'viewer';

    // Get template with owner info
    const { data: tmpl, error: tmplErr } = await supabase
      .from('templates')
      .select('id, owner_id, main_owner_id, owner_chain, template_code, name')
      .eq('id', template_id)
      .single();

    if (tmplErr || !tmpl) return json({ error: 'Template not found' }, { status: 404 });

    const mainOwnerId = tmpl.main_owner_id || tmpl.owner_id;
    const isMainOwner = from_user_id === mainOwnerId || from_user_id === tmpl.owner_id;

    // Find to_user_id if exists
    let toUserId = null;
    try {
      const { data: prof } = await chatDB.from('profiles').select('id').ilike('email', cleanToEmail).maybeSingle();
      if (prof) toUserId = prof.id;
    } catch {}

    if (isMainOwner) {
      // MAIN OWNER -> Auto Approve, Level 1 indirect_owner
      const { data: inserted, error } = await supabase.from('template_shares').insert({
        template_id: tmpl.id,
        template_code: template_code || tmpl.template_code,
        from_user_id,
        from_email,
        to_email: cleanToEmail,
        to_user_id: toUserId,
        role: cleanRole,
        status: 'approved',
        level: 1
      }).select().single();

      if (error) throw error;

      // Update owner_chain in templates
      let chain = Array.isArray(tmpl.owner_chain) ? tmpl.owner_chain : [];
      // remove if exists then add
      chain = chain.filter((c: any) => c.email !== cleanToEmail);
      chain.push({ email: cleanToEmail, user_id: toUserId, role: cleanRole, level: 1, approved_at: new Date().toISOString() });

      await supabase.from('templates').update({
        owner_chain: chain,
        main_owner_id: mainOwnerId
      }).eq('id', tmpl.id);

      return json({ ok: true, approved: true, data: inserted, message: `${cleanToEmail} added as ${cleanRole}` });
    } else {
      // INDIRECT OWNER -> Needs Main Owner Approval
      // Check if requester is allowed to share (must be indirect_owner)
      const requesterChain = (tmpl.owner_chain || []).find((c: any) => c.email === from_email?.toLowerCase() || c.user_id === from_user_id);
      if (!requesterChain || !['indirect_owner', 'owner'].includes(requesterChain.role)) {
        return json({ error: 'Only owners can share' }, { status: 403 });
      }

      const { data: inserted, error } = await supabase.from('template_shares').insert({
        template_id: tmpl.id,
        template_code: template_code || tmpl.template_code,
        from_user_id,
        from_email,
        to_email: cleanToEmail,
        to_user_id: toUserId,
        role: 'viewer', // indirect can only give viewer, owner role needs main approval upgrade
        status: 'pending',
        level: 2
      }).select().single();

      if (error) throw error;

      return json({ ok: true, approved: false, data: inserted, message: `Request sent to Main Owner for approval` });
    }
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}

export async function GET({ url }: any) {
  const template_id = url.searchParams.get('template_id');
  if (!template_id) return json({ shares: [] });
  const { data } = await supabase.from('template_shares').select('*').eq('template_id', template_id).order('created_at', { ascending: false });
  return json({ shares: data || [] });
}