import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

const url = publicEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_CHAT_URL || privateEnv.SUPABASE_CHAT_URL || privateEnv.PUBLIC_SUPABASE_URL;
const serviceKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY || privateEnv.SUPABASE_CHAT_SERVICE_KEY || privateEnv.SUPABASE_TEMPLATES_SERVICE_KEY;

if (!url) {
  console.error("Available public env:", publicEnv);
  console.error("Available private env keys:", Object.keys(privateEnv));
  throw new Error(`Missing URL. Found: ${JSON.stringify(Object.keys(publicEnv))}`);
}

export const supabaseAdmin = createClient(url, serviceKey!, {
  auth: { autoRefreshToken: false, persistSession: false }
});