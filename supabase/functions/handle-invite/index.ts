import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const action = url.searchParams.get('action') // accept or reject
  
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: { user } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') || '')
  if(!user) return new Response("Please login first", {status: 401})

  const { data: invite } = await supabase.from('contact_invites').select('*').eq('token', token).single()
  if(!invite || invite.status !== 'pending') return new Response("Invite expired", {status: 400})

  if(action === 'accept') {
    // 1. Create profile if not exists
    await supabase.from('profiles').upsert({id: user.id, email: user.email})
    // 2. Update invite
    await supabase.from('contact_invites').update({status: 'accepted', invited_user: user.id}).eq('id', invite.id)
    // 3. Create room immediately
    await supabase.rpc('get_or_create_room', {p_user1: invite.invited_by, p_user2: user.id})
    
    return new Response(`<h1>Accepted ✅</h1><p>You can now chat with ${invite.invited_by}</p>`, {headers: {'Content-Type': 'text/html'}})
  }
  
  if(action === 'reject') {
    await supabase.from('contact_invites').update({status: 'rejected', invited_user: user.id}).eq('id', invite.id)
    return new Response(`<h1>Rejected ❌</h1>`, {headers: {'Content-Type': 'text/html'}})
  }

  return new Response("Invalid action", {status: 400})
})