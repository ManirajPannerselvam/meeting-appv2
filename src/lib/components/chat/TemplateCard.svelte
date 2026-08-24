<script lang="ts">
  let { data } = $props();

  let values = $derived.by(() => {
    try {
      if (data?.values) return data.values;
      if (typeof data === 'string' && data.includes('__TEMPLATE_DATA__')) {
        const json = data.split('__TEMPLATE_DATA__')[1]?.trim();
        const parsed = JSON.parse(json);
        return parsed.values || {};
      }
      return data || {};
    } catch { return {}; }
  });

  let templateCode = $derived.by(() => {
    try {
      if (data?.template_code) return data.template_code;
      if (typeof data === 'string' && data.includes('__TEMPLATE_DATA__')) {
        const json = data.split('__TEMPLATE_DATA__')[1]?.trim();
        return JSON.parse(json).template_code || 'PRO01';
      }
      return 'PRO01';
    } catch { return 'PRO01'; }
  });

  let theme = $derived.by(() => {
    if (templateCode === 'PRO01') return { bg: '#e6f0ff', border: '#c7dbff', title: '#0f172a' };
    if (templateCode === 'MAINT') return { bg: '#fef3c7', border: '#fde68a', title: '#92400e' };
    if (templateCode === 'QUAL') return { bg: '#dcfce7', border: '#bbf7d0', title: '#166534' };
    return { bg: '#e6f0ff', border: '#c7dbff', title: '#0f172a' };
  });

  function getYield() {
    const inp = Number(values.input01 || 0);
    const out = Number(values.output01 || 0);
    if (!inp) return '-';
    return ((out / inp) * 100).toFixed(2) + '%';
  }
</script>

<div class="card" style="background:{theme.bg}; border: 1px solid {theme.border}">
  <div class="card-header">
    <span>📋</span>
    <b style="color:{theme.title}">Production Tracker</b>
  </div>
  <div class="card-body">
    <div class="row"><span>Shift:</span><b>{values.shift || '-'}</b></div>
    <div class="row"><span>Station:</span><b>{values.station || 'RAT'}</b></div>
    <div class="row"><span>RAT Input:</span><b>{values.input01?? '-'}</b></div>
    <div class="row"><span>RAT Output:</span><b>{values.output01?? '-'}</b></div>
    <div class="row"><span>RAT Yield:</span><b>{formatYield()}</b></div>
    {#if values.remark01}
      <div class="row remark"><span>Remark:</span><b>{values.remark01}</b></div>
    {/if}
  </div>
</div>

<style>
.card{ border-radius:12px; overflow:hidden; min-width:240px; max-width:320px; margin:4px 0; }
.card-header{ display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid rgba(0,0,0,0.08); background:rgba(255,255,255,0.6); }
.card-header b{ font-size:14px; font-weight:800; }
.card-body{ padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
.row{ display:flex; justify-content:space-between; gap:20px; }
.row span{ font-size:13px; color:#334155; }
.row b{ font-size:13px; color:#0f172a; font-weight:700; text-align:right; max-width:150px; }
.row.remark{ flex-direction:column; align-items:flex-start; gap:2px; margin-top:4px; padding-top:6px; border-top:1px dashed rgba(0,0,0,0.1); }
.row.remark b{ text-align:left; max-width:100%; font-weight:500; white-space:normal; }
</style>