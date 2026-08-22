// src/lib/components/templates/form/formula.ts
export function calculateFormula(formula: string, values: Record<string, any>): number | null {
  if (!formula) return null;
  let expr = formula.trim();

  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(values)) {
    normalized[k] = v;
    normalized[k.replace(/\s+/g, '_')] = v;
    normalized[k.replace(/_/g, ' ')] = v;
    normalized[k.toLowerCase()] = v;
    normalized[k.replace(/\s+/g, '_').toLowerCase()] = v;
  }

  const keys = Object.keys(normalized).sort((a,b)=>b.length-a.length);
  for (const key of keys) {
    const raw = normalized[key];
    let num = 0;
    if (raw!== '' && raw!== null && raw!== undefined && raw!== '-') {
      const parsed = parseFloat(String(raw).replace(/%/g,'').replace(/,/g,''));
      if (!isNaN(parsed)) num = parsed;
    }
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expr = expr.replace(new RegExp(`\\b${esc}\\b`, 'g'), String(num));
  }

  if (/[A-Za-z_]/.test(expr)) return null;
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return null;
  if (expr.includes('//') || /\(\s*\/\s*\)/.test(expr)) return null;

  try {
    const fn = new Function(`return (${expr})`);
    const result = fn();
    if (typeof result === 'number' && isFinite(result)) {
      return Number(result.toFixed(2));
    }
    return null;
  } catch {
    return null;
  }
}