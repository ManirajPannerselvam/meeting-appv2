import { supabaseAdmin } from '$lib/supabaseAdmin';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const fileName = formData.get('fileName') as string;

  if (!file) return new Response(JSON.stringify({error: 'No file'}), {status: 400});

  const buffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage.from('avatars').upload(fileName, buffer, {
    contentType: 'image/webp',
    upsert: true
  });

  if (error) return new Response(JSON.stringify({error: error.message}), {status: 500});

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName);

  return new Response(JSON.stringify({ url: data.publicUrl }), {status: 200});
}