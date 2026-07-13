export async function POST() {
  // If using refresh tokens in DB, invalidate here
  return new Response(JSON.stringify({ success: true }));
}