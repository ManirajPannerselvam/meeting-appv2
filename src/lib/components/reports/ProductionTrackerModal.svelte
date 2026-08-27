<script lang="ts">
  let {
    open = false,
    data = null,
    onClose = () => {}
  } = $props();

  let values = $derived(data?.values || data?.data || {});
  let station = $derived(values?.station || '-');
  let shift = $derived(values?.shift || '-');
  let remark = $derived(values?.remark01 || values?.remark || '-');

  // Dynamic fields except system ones
  let dynamicEntries = $derived(
    Object.entries(values).filter(([k])=>!['shift','station','remark01','remark','t_code','input01','output01'].includes(k))
  );

  let input = $derived(values?.input01 || values?.input || 0);
  let output = $derived(values?.output01 || values?.output || 0);
  let yieldVal = $derived(input > 0? ((output / input) * 100).toFixed(2) + '%' : values?.yield || '-');

  let sentBy = $derived(data?.user_name || data?.created_by_name || data?.profiles?.name || data?.sender_name || values?.user_name || '-');
  let sentEmail = $derived(data?.user_email || data?.profiles?.email || data?.created_by_email || '');
  let sentAt = $derived(data?.created_at || data?.inserted_at || data?.report_date || data?.ts || '');
  let sentUserId = $derived(data?.user_id || data?.created_by || data?.sender || '');
  let tName = $derived(data?.template_name || data?.templates?.name || data?.t_code || 'Production Tracker');
  let tCode = $derived(data?.t_code || data?.template_code || values?.t_code || '');

  function formatTime(ts: string) {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString('en-IN', {
        day:'2-digit', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit', hour12:true
      });
    } catch { return ts; }
  }
  function close() { onClose(); }
  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
</script>

{#if open && data}
<div class="overlay" onclick={onBackdrop} role="dialog" tabindex="-1">
  <div class="modal">
    <div class="head">
      <h3>📋 {tName}</h3>
      <button class="x" onclick={close}>✕</button>
    </div>

    <div class="body">
      <div class="tracking">
        <div class="avatar">👤</div>
        <div class="t-info">
          <strong>{sentBy}</strong>
          {#if sentEmail}<span>{sentEmail}</span>{/if}
          <span class="time">📅 {formatTime(sentAt)}</span>
        </div>
        <div class="badge">{shift} - {station}</div>
      </div>

      <div class="grid">
        <div class="item"><span>Shift:</span><b>{shift}</b></div>
        <div class="item"><span>Station:</span><b>{station}</b></div>
        {#if input || output}
          <div class="item"><span>RAT Input:</span><b>{input}</b></div>
          <div class="item"><span>RAT Output:</span><b>{output}</b></div>
          <div class="item highlight"><span>RAT Yield:</span><b>{yieldVal}</b></div>
        {/if}
        {#each dynamicEntries as [k,v]}
          <div class="item"><span>{k}:</span><b>{v?? '-'}</b></div>
        {/each}
      </div>

      {#if remark && remark!=='-'}
      <div class="remark">
        <span>Remark:</span>
        <p>{remark}</p>
      </div>
      {/if}

      <div class="audit">
        <span>🆔 User ID: {sentUserId || 'N/A'}</span>
        <span>📄 Code: {tCode || 'N/A'}</span>
        <span>🕒 Submitted: {formatTime(sentAt)}</span>
      </div>
    </div>

    <div class="foot">
      <button class="close-btn" onclick={close}>Close</button>
    </div>
  </div>
</div>
{/if}

<style>
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; }
.modal{ background:white; border-radius:12px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.2); max-height:90vh; overflow-y:auto; }
.head{ display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; position:sticky; top:0; background:white; z-index:2; }
.head h3{ margin:0; font-size:15px; font-weight:700; }
.x{ background:#f1f5f9; border:none; width:32px; height:32px; border-radius:8px; cursor:pointer; }
.body{ padding:16px 18px; }
.tracking{ display:flex; gap:10px; align-items:center; background:#f1f5f9; padding:10px 12px; border-radius:10px; margin-bottom:14px; }
.avatar{ width:36px; height:36px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.t-info{ display:flex; flex-direction:column; flex:1; min-width:0; }
.t-info strong{ font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.t-info span{ font-size:11px; color:#64748b; }
.t-info.time{ color:#0f172a; font-weight:600; }
.badge{ background:#111827; color:white; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; flex-shrink:0; }
.grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.item{ background:#f8fafc; padding:10px 12px; border-radius:8px; display:flex; flex-direction:column; gap:3px; word-break:break-word; }
.item span{ font-size:10px; color:#64748b; text-transform:uppercase; font-weight:600; }
.item b{ font-size:13px; color:#0f172a; }
.item.highlight{ background:#dcfce7; }.item.highlight b{ color:#16a34a; }
.remark{ margin-top:14px; background:#f8fafc; padding:10px 12px; border-radius:8px; }
.remark span{ font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; }
.remark p{ margin:6px 0 0; font-size:13px; color:#334155; white-space:pre-wrap; }
.audit{ margin-top:12px; padding:8px 10px; background:#fff7ed; border:1px dashed #fed7aa; border-radius:8px; display:flex; flex-direction:column; gap:2px; }
.audit span{ font-size:10px; color:#9a3412; }
.foot{ padding:10px 18px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; }
.close-btn{ background:#111827; color:white; border:none; padding:8px 18px; border-radius:8px; cursor:pointer; font-weight:600; }
</style>