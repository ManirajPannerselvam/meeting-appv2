/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/server/monitoring.ts
 * ============================================================
 */

type ApiMetric = { calls: number; total: number; avg: number };
type DbQuery = { sql: string; ms: number; at: number };
type MemorySample = { ts: number; mem: NodeJS.MemoryUsage | null };
type CpuSample = { ts: number; cpu: NodeJS.CpuUsage | null };

const metrics = {
  apis: {} as Record<string, ApiMetric>,
  db: { queries: [] as DbQuery[] },
  ws: { connections: 0 },
  memory: [] as MemorySample[],
  cpu: [] as CpuSample[]
};

/**
 * Record API timing
 */
export function recordApiTime(name: string, ms: number): void {
  metrics.apis[name] = metrics.apis[name] || { calls: 0, total: 0, avg: 0 };
  metrics.apis[name].calls++;
  metrics.apis[name].total += ms;
  metrics.apis[name].avg = metrics.apis[name].total / metrics.apis[name].calls;
}

/**
 * Record DB query
 */
export function recordDbQuery(sql: string, ms: number): void {
  metrics.db.queries.push({ sql, ms, at: Date.now() });
  // keep last 500 queries
  if (metrics.db.queries.length > 500) metrics.db.queries.shift();
}

export function incWsConnections(): void {
	metrics.ws.connections++;
}

export function decWsConnections(): void {
	metrics.ws.connections = Math.max(0, metrics.ws.connections - 1);
}

/**
 * Sample system memory + cpu
 */
export function sampleSystem(): void {
  try {
    const mem = typeof process!== 'undefined' && process.memoryUsage? process.memoryUsage() : null;
    const cpu = typeof process!== 'undefined' && process.cpuUsage? process.cpuUsage() : null;

    metrics.memory.push({ ts: Date.now(), mem });
    metrics.cpu.push({ ts: Date.now(), cpu });

    // keep last 100 samples
    if (metrics.memory.length > 100) metrics.memory.shift();
    if (metrics.cpu.length > 100) metrics.cpu.shift();
  } catch (e) {
		console.error('sampleSystem error', e)
	}
}

export function getMetrics() {
	return metrics;
}

export default {
	recordApiTime,
	recordDbQuery,
	incWsConnections,
	decWsConnections,
	sampleSystem,
	getMetrics
};