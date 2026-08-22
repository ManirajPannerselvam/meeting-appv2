import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { email, invited_by } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // 1. Create invite record
  const invite_token = crypto.randomUUID()
  const { data: invite } = await supabase.from('contact_invites').insert({
    email,
    invited_by,
    token: invite_token,
    status: 'pending'
  }).select().single()

  // 2. Send invite email with accept/reject links
  const acceptUrl = `https://ykoghqkzhsgbspmlvsgt.supabase.co/functions/v1/handle-invite?token=${invite_token}&action=accept`
  const rejectUrl = `https://ykoghqkzhsgbspmlvsgt.supabase.co/functions/v1/handle-invite?token=${invite_token}&action=reject`

  await supabase.auth.admin.inviteUserByEmail(email, { 
    data: { invite_token },
    redirectTo: acceptUrl // after signup they land here
  })

  return new Response(JSON.stringify({invite}), {headers: {...corsHeaders, "Content-Type": "application/json"}})
})