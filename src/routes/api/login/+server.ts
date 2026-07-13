import { json } from "@sveltejs/kit";
import { getUsers } from "$lib/server/storage/storage";
import rateLimit from '$lib/server/rate-limit';
import monitor from '$lib/server/monitoring';

export async function POST({ request }) {
  const t0 = Date.now();
  const ip = rateLimit.getIPFromRequest(request);
  const ipCheck = rateLimit.checkRateLimitByIP(ip, 20, 60 * 1000); // 20 reqs/min per IP
  if (!ipCheck.ok) return json({ error: 'ip_rate_limited' }, { status: 429 });

  const { mobile, password } = await request.json();

  // per-user attempt limit
  const userKey = `login:${mobile}`;
  const userCheck = rateLimit.checkRateLimitByUser(userKey, 5, 60 * 60 * 1000); // 5 tries per hour
  if (!userCheck.ok) { rateLimit.recordAbuse({ ip, mobile, reason: 'login_rate' }); return json({ error: 'too_many_attempts' }, { status: 429 }); }

  const users = getUsers();

  const user = users.find(
    u => u.mobile === mobile && u.password === password
  );

  if (!user) {
    monitor.recordApiTime('login', Date.now() - t0);
    return json({ error: "Invalid credentials" }, { status: 401 });
  }
  monitor.recordApiTime('login', Date.now() - t0);
  return json({
    success: true,
    user
  });
}
