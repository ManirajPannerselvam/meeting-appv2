const metrics = {
  apis: {},
  db: { queries: [] },
  ws: { connections: 0 },
  memory: [],
  cpu: []
};

export function recordApiTime(name, ms) {
  metrics.apis[name] = metrics.apis[name] || { calls: 0, total: 0, avg: 0 };
  metrics.apis[name].calls++;
  metrics.apis[name].total += ms;
  metrics.apis[name].avg = metrics.apis[name].total / metrics.apis[name].calls;
}

export function recordDbQuery(sql, ms) {
  metrics.db.queries.push({ sql, ms, at: Date.now() });
}

export function incWsConnections() { metrics.ws.connections++; }
export function decWsConnections() { metrics.ws.connections = Math.max(0, metrics.ws.connections - 1); }

export function sampleSystem() {
  try {
    const mem = process && process.memoryUsage ? process.memoryUsage() : null;
    const cpu = process && process.cpuUsage ? process.cpuUsage() : null;
    metrics.memory.push({ ts: Date.now(), mem });
    metrics.cpu.push({ ts: Date.now(), cpu });
    // keep last 100 samples
    if (metrics.memory.length > 100) metrics.memory.shift();
    if (metrics.cpu.length > 100) metrics.cpu.shift();
  } catch (e) {}
}

export function getMetrics() { return metrics; }

export default { recordApiTime, recordDbQuery, incWsConnections, decWsConnections, sampleSystem, getMetrics };
