export async function handle({ event, resolve }) {
  // ❌ REMOVE initDB()
  return resolve(event);
}