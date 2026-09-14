<script lang="ts">
  let { data } = $props();

  function safeStr(v: any, len=120): string {
    if(v==null || v==="") return '-';
    return String(v).slice(0,len).replace(/</g,'&lt;').replace(/>/g,'&gt;').trim() || '-';
  }
  function safeNum(v: any): number {
    let n = Number(String(v??'').replace(/[^0-9.\-]/g,''));
    if(isNaN(n)) return 0;
    return Math.max(-1e9, Math.min(1e9, n));
  }

  let parsed = $derived.by(() => {
    try {
      let vals: any = {};
      let code = 'PRO01';
      if (data?.values) { vals = data.values; code = data.template_code || data.t_code || data.code || 'PRO01'; }
      else if (data?.data?.values) { vals = data.data.values; }
      else if (typeof data === 'string' && data.includes('__TEMPLATE_DATA__')) {
        const part = data.split('__TEMPLATE_DATA__')[1]?.trim().slice(0,8000);
        if(part){
          const obj = JSON.parse(part);
          vals = obj.values || obj.data || {};
          code = obj.template_code || obj.t_code || obj.code || 'PRO01';
        }
      } else if (typeof data === 'object' && data!==null) {
        // could be direct values
        if(data.template_name || data.Station || data.station || data.Input || data.input01){
          vals = data;
        } else {
          vals = data;
        }
        code = data.template_code || data.t_code || 'PRO01';
      }
      return { values: vals || {}, code: String(code).slice(0,20) };
    } catch { return { values: {}, code: 'PRO01' }; }
  });

  let values = $derived(parsed.values);
  let templateCode = $derived(parsed.code);

  // ✅ 50K FIX: case-insensitive get
  function getVal(...keys: string[]): any {
    for(let k of keys){
      if(!k) continue;
      if(values[k]!==undefined && values[k]!=="" && values[k]!==null) return values[k];
      let low = k.toLowerCase();
      let found = Object.keys(values).find(x=> x.toLowerCase()===low || x.toLowerCase().replace(/[\s_]+/g,'')===low.replace(/[\s_]+/g,''));
      if(found && values[found]!=="" && values[found]!==null) return values[found];
    }
    return "";
  }

  let theme = $derived.by(() => {
    if (templateCode === 'PRO01' || templateCode.includes('PRO')) return { bg: '#e6f0ff', border: '#c7dbff', title: '#0f172a' };
    if (templateCode === 'MAINT') return { bg: '#fef3c7', border: '#fde68a', title: '#92400e' };
    if (templateCode === 'QUAL') return { bg: '#dcfce7', border: '#bbf7d0', title: '#166534' };
    return { bg: '#e6f0ff', border: '#c7dbff', title: '#0f172a' };
  });

  function getYield() {
    // try direct yield field first
    let direct = getVal('Yield','yield','RAT Yield','yield_percent','yield01');
    if(direct && String(direct).trim()!=='-' && String(direct).trim()!==""){
      let s = String(direct).trim();
      return s.includes('%')? s : s + '%';
    }
    const inp = safeNum(getVal('Input','input','input01','RAT Input','shift_input'));
    const out = safeNum(getVal('Output','output','output01','RAT Output','shift_output'));
    if (!inp) return '0.00%';
    return ((out / inp) * 100).toFixed(2) + '%';
  }
</script>

<div class="card" style="background:{theme.bg}; border: 1px solid {theme.border}">
  <div class="card-header">
    <span>📋</span>
    <b style="color:{theme.title}">{safeStr(getVal('template_name','Template Name','Daily Yield') || 'Production Tracker', 30)}</b>
  </div>
  <div class="card-body">
    <div class="row"><span>Shift:</span><b>{safeStr(getVal('Shift','shift','shift01')||'-', 30)}</b></div>
    <div class="row"><span>Station:</span><b>{safeStr(getVal('Station','station','station_name','Station Name')||'RAT', 30)}</b></div>
    <div class="row"><span>RAT Input:</span><b>{safeStr(getVal('Input','input','input01','RAT Input')||'-', 30)}</b></div>
    <div class="row"><span>RAT Output:</span><b>{safeStr(getVal('Output','output','output01','RAT Output')||'-', 30)}</b></div>
    <div class="row"><span>RAT Yield:</span><b>{getYield()}</b></div>
    {#if getVal('Remark','remark','remark01','Remarks')}
      <div class="row remark"><span>Remark:</span><b>{safeStr(getVal('Remark','remark','remark01','Remarks'), 300)}</b></div>
    {/if}
  </div>
</div>

<style>
.card{ border-radius:12px; overflow:hidden; min-width:240px; max-width:320px; margin:4px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.card-header{ display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid rgba(0,0,0,0.08); background:rgba(255,255,255,0.6); }
.card-header b{ font-size:14px; font-weight:800; }
.card-body{ padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
.row{ display:flex; justify-content:space-between; gap:12px; }
.row span{ font-size:13px; color:#334155; flex-shrink:0; }
.row b{ font-size:13px; color:#0f172a; font-weight:700; text-align:right; max-width:165px; word-break:break-word; }
.row.remark{ flex-direction:column; align-items:flex-start; gap:2px; margin-top:4px; padding-top:6px; border-top:1px dashed rgba(0,0,0,0.1); }
.row.remark b{ text-align:left; max-width:100%; font-weight:500; white-space:normal; }
</style>