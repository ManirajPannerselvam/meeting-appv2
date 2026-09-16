<script lang="ts">
export let meeting: any = null;
export let open = false;
export let onClose: () => void;
import { goto } from "$app/navigation";
function formatDate(d:string){ if(!d) return "-"; return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) }
</script>

{#if open && meeting}
<div class="overlay" onclick={onClose}>
  <div class="popup" onclick={(e)=> e.stopPropagation()}>
    <div class="p-head">
      <div><small>#{meeting.id}</small><h2>{meeting.title}</h2></div>
      <button class="close" onclick={onClose}>✕</button>
    </div>
    <div class="p-body">
      <p>📅 {formatDate(meeting.meeting_date)} {meeting.start_time}</p>
      <p>📍 {meeting.location}</p>
      <p>📝 {meeting.agenda}</p>
    </div>
    <div class="p-foot">
      <button onclick={onClose}>Close</button>
      <button onclick={()=> goto(`/minutes/${meeting.id}`)}>📊 Report</button>
    </div>
  </div>
</div>
{/if}

<style>
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; }
.popup{ background:white; width:100%; max-width:480px; border-radius:20px; overflow:hidden; }
.p-head{ padding:16px; display:flex; justify-content:space-between; background:#f8fafc; border-bottom:1px solid #eee; }
.p-body{ padding:16px; display:flex; flex-direction:column; gap:8px; }
.p-foot{ padding:12px; display:flex; gap:8px; border-top:1px solid #eee; }
.p-foot button{ flex:1; padding:10px; border-radius:10px; border:1px solid #e2e8f0; font-weight:700; }
.close{ width:32px; height:32px; border-radius:50%; border:1px solid #ddd; background:white; }
@media(max-width:600px){ .overlay{ align-items:flex-end; padding:0; } .popup{ border-radius:20px 20px 0 0; } }
</style>