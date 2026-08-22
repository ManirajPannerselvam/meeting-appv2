import { log } from "$lib/debug/logger";

// Basic runtime route checker - will attempt to fetch each route to verify it loads.
export async function checkRoutes(routes: string[]) {
  const results: { route: string; ok: boolean; status?: number }[] = [];

  for (const r of routes) {
    try {
      // prefer HEAD to minimize payload; some servers may not support HEAD so fallback to GET
      let res: Response | null = null;
      try {
        res = await fetch(r, { method: 'HEAD' });
      } catch (e) {
        try {
          res = await fetch(r, { method: 'GET' });
        } catch (ee) {
          res = null as any;
        }
      }

      if (res && res.ok) {
        results.push({ route: r, ok: true, status: res.status });
      } else {
        results.push({ route: r, ok: false, status: res ? res.status : undefined });
        await log('WARN', 'ROUTE_HEALTH', `Route failed: ${r} status=${res ? res.status : 'no-response'}`); // FIXED: 3 args
      }
    } catch (e) {
      results.push({ route: r, ok: false });
      await log('ERROR', 'ROUTE_HEALTH', `Error checking route ${r}: ${String(e)}`); // FIXED: 3 args
    }
  }

  await log('INFO', 'ROUTE_HEALTH', `Route health: ${JSON.stringify(results)}`); // FIXED: 3 args
  return results;
}

export default { checkRoutes };