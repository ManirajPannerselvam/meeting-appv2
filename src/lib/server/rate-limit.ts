/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/server/rate-limit.ts
 * ============================================================
 * PURPOSE
 * Simple in-memory rate limiter for API routes
 * ============================================================
 */

type RateLimitEntry = {
	times: number[];
};

type RateLimitResult = {
	ok: boolean;
	remaining: number;
};

type AbuseDetails = {
	ip?: string;
	userKey?: string;
	path?: string;
	reason?: string;
};

const ipStore = new Map<string, RateLimitEntry>();
const userStore = new Map<string, RateLimitEntry>();

function now(): number {
	return Date.now();
}

export function checkRateLimitByIP(
	ip: string | null | undefined,
	limit = 60,
	windowMs = 60 * 1000
): RateLimitResult {
	if (!ip) ip = 'unknown';
	
	const entry = ipStore.get(ip) || { times: [] };
	const cutoff = now() - windowMs;
	
	entry.times = entry.times.filter(t => t > cutoff);
	
	if (entry.times.length >= limit) {
		ipStore.set(ip, entry);
		return { ok: false, remaining: 0 };
	}
	
	entry.times.push(now());
	ipStore.set(ip, entry);
	return { ok: true, remaining: limit - entry.times.length };
}

export function checkRateLimitByUser(
	userKey: string | null | undefined,
	limit = 60,
	windowMs = 60 * 1000
): RateLimitResult {
	if (!userKey) userKey = 'anonymous';
	
	const entry = userStore.get(userKey) || { times: [] };
	const cutoff = now() - windowMs;
	
	entry.times = entry.times.filter(t => t > cutoff);
	
	if (entry.times.length >= limit) {
		userStore.set(userKey, entry);
		return { ok: false, remaining: 0 };
	}
	
	entry.times.push(now());
	userStore.set(userKey, entry);
	return { ok: true, remaining: limit - entry.times.length };
}

export function getIPFromRequest(request: Request): string {
	try {
		const xf = request.headers.get('x-forwarded-for');
		if (xf) return xf.split(',')[0].trim();
		return request.headers.get('x-real-ip') || 'unknown';
	} catch (e) {
		return 'unknown';
	}
}

export function recordAbuse(details: AbuseDetails): void {
	try {
		console.warn('RateLimit abuse:', details);
	} catch (e) {}
}

export default {
	checkRateLimitByIP,
	checkRateLimitByUser,
	getIPFromRequest,
	recordAbuse
};