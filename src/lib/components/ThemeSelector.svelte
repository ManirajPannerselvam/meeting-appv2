<script>
  import { themeStore } from '$lib/stores/theme';
  import { onMount } from 'svelte';
  let current = 'whatsapp';
  onMount(()=>{ themeStore.init(); themeStore.subscribe(v=>current=v); });
  const themes = themeStore.getAll();
</script>

<div class="theme-grid">
  {#each themes as th}
    <button class="theme-btn {current===th?'active':''}" onclick={()=>themeStore.setTheme(th)}>
      <span class="dot {th}"></span>
      <span class="name">{th}</span>
    </button>
  {/each}
</div>

<style>
  .theme-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:12px; }
  .theme-btn{
    display:flex; flex-direction:column; align-items:center; gap:6px;
    padding:12px 6px; border-radius:12px; border:2px solid var(--border);
    background:var(--card); color:var(--text); cursor:pointer;
  }
  .theme-btn.active{ border-color:var(--accent); background:var(--input-bg); }
  .dot{ width:28px; height:28px; border-radius:50%; }
  .dot.light{ background:#f5f7fb; border:1px solid #ddd; } .dot.dark{ background:#0f172a; }
  .dot.whatsapp{ background:#00a884; } .dot.telegram{ background:#2b88d8; }
  .dot.instagram{ background:linear-gradient(45deg,#feda75,#d62976,#4f5bd5); }
  .dot.discord{ background:#5865f2; } .dot.snapchat{ background:#fffc00; }
  .dot.slack{ background:#350d36; } .dot.messenger{ background:#0099ff; }
  .dot.twitter{ background:#000; } .dot.minimal{ background:#fff; border:1px solid #000; }
  .dot.imessage{ background:#0a84ff; }
  .name{ font-size:11px; font-weight:700; text-transform:capitalize; }
</style>
