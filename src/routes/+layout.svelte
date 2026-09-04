<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase/client';
  export let data;

  let online = true;
  let rtt: number | null = null;
  let downlink: any = null;
  let responseTime: number | null = null;
  let showNet = true;

  const modules = ['/', '/chat', '/reports', '/dashboard', '/templates'];
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let isSwiping = false;

  function getModuleIndex(path: string){
    if(path==='/' ) return 0;
    if(path.startsWith('/chat')) return 1;
    if(path.startsWith('/reports')) return 2;
    if(path.startsWith('/dashboard')) return 3;
    if(path.startsWith('/templates')) return 4;
    return 0;
  }

  function shouldIgnoreSwipe(target: any){
    if(!target) return false;
    const tag = target.tagName?.toLowerCase();
    if(['button','input','select','textarea','a'].includes(tag)) return true;
    if(target.closest('button, input, select, textarea, a,.table-wrapper, [data-no-swipe]')) return true;
    return false;
  }

  function onTouchStart(e: TouchEvent){
    if(shouldIgnoreSwipe(e.target)) { isSwiping = false; return; }
    if($page.url.pathname.startsWith('/templates')) { isSwiping = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    isSwiping = true;
  }

  function onTouchEnd(e: TouchEvent){
    if(!isSwiping) return;
    isSwiping = false;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX;
    const diffY = endY - startY;
    const elapsed = Date.now() - startTime;
    if(Math.abs(diffX) < 120) return;
    if(Math.abs(diffY) > 50) return;
    if(elapsed > 500) return;
    if(Math.abs(diffX) < Math.abs(diffY) * 1.5) return;
    const currentPath = $page.url.pathname;
    let idx = getModuleIndex(currentPath);
    if(diffX < -120){
      const next = (idx + 1) % modules.length;
      goto(modules[next]);
    } else if(diffX > 120){
      const prev = (idx - 1 + modules.length) % modules.length;
      goto(modules[prev]);
    }
  }

  function applyThemeFromStorage(){
    if(!browser) return;
    let saved = 'whatsapp';
    try{ saved = localStorage.getItem('ems_theme') || 'whatsapp'; }catch{}
    let t = saved.toLowerCase();
    if(t==='system'){
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      t = isDark? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-social-theme', 'system');
    } else {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-social-theme', t);
    }
    document.documentElement.style.colorScheme = ['dark','whatsapp','discord','twitter','slack'].includes(t)? 'dark' : 'light';
  }

  async function loadThemeFromSettings(){
    if(!browser) return;
    try{
      const { data } = await supabase.from('settings').select('appearance').eq('id',1).maybeSingle();
      if(data?.appearance?.theme){
        localStorage.setItem('ems_theme', data.appearance.theme);
        applyThemeFromStorage();
      }
    }catch{}
  }

  onMount(() => {
    if(!browser) return;
    applyThemeFromStorage();
    loadThemeFromSettings();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
      const saved = localStorage.getItem('ems_theme');
      if(saved?.toLowerCase()==='system') applyThemeFromStorage();
    });

    online = navigator.onLine;
    const conn: any = (navigator as any).connection;
    if(conn){
      rtt = conn.rtt;
      downlink = conn.downlink;
      conn.addEventListener('change', ()=>{
        rtt = conn.rtt;
        downlink = conn.downlink;
      });
    }
    window.addEventListener('online', ()=> online = true);
    window.addEventListener('offline', ()=> online = false);

    window.addEventListener('touchstart', onTouchStart, { passive: true } as any);
    window.addEventListener('touchend', onTouchEnd, { passive: true } as any);
  });

  onDestroy(()=>{
    if(!browser) return;
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  });
</script>

{#if browser && showNet}
<div class="net-bar" class:offline={!online}>
  <span>{online? '● Online' : '○ Offline'}</span>
  {#if rtt!==null}<span>RTT {rtt}ms</span>{/if}
  {#if downlink}<span>{downlink}Mb/s</span>{/if}
  <button class="net-close" on:click={()=>showNet=false}>✕</button>
</div>
{/if}

<div class="swipe-root" data-no-swipe>
  <slot />
</div>

<div class="module-dots">
  {#each modules as m, i}
    <div class="dot" class:active={getModuleIndex($page.url.pathname)===i}></div>
  {/each}
</div>

<style>
.net-bar{ height:24px; background:#111b21; color:#aebac1; display:flex; gap:12px; align-items:center; padding:0 12px; font-size:11px; font-family:monospace; border-bottom:1px solid #222d34; position:sticky; top:0; z-index:999; }
.net-bar.offline{ background:#5a1a1a; color:#ffb4b4; }
.net-close{ margin-left:auto; background:transparent; border:none; color:inherit; cursor:pointer; }
.swipe-root{ min-height:calc(100vh - 24px); touch-action: pan-y; }
.module-dots{ position:fixed; bottom:60px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:50; pointer-events:none; }
.dot{ width:6px; height:6px; border-radius:50%; background:#3a4a54; opacity:0.5; }
.dot.active{ background:#00a884; opacity:1; width:18px; border-radius:3px; }
  @media(min-width:769px){.module-dots{ display:none; } }
  :global(:root){ --bg:#111b21; --card:#202c33; --text:#e9edef; --border:#2a3942; --accent:#00a884; }
  :global([data-theme="light"]){ --bg:#ffffff; --card:#ffffff; --text:#0f172a; --border:#e2e8f0; --accent:#2563eb; }
  :global([data-theme="dark"]){ --bg:#0f172a; --card:#1e293b; --text:#e2e8f0; --border:#334155; --accent:#3b82f6; }
  :global([data-theme="whatsapp"]){ --bg:#111b21; --card:#202c33; --text:#e9edef; --border:#2a3942; --accent:#00a884; }
  :global([data-theme="telegram"]){ --bg:#e6f3ff; --card:#ffffff; --text:#000000; --border:#d1e7ff; --accent:#2b88d8; }
  :global([data-theme="instagram"]){ --bg:#fafafa; --card:#ffffff; --text:#262626; --border:#dbdbdb; --accent:#d62976; }
  :global([data-theme="imessage"]){ --bg:#f5f5f7; --card:#ffffff; --text:#000000; --border:#e5e5e5; --accent:#0a84ff; }
  :global([data-theme="discord"]){ --bg:#313338; --card:#2b2d31; --text:#f2f3f5; --border:#3f4147; --accent:#5865f2; }
  :global([data-theme="snapchat"]){ --bg:#fffef0; --card:#ffffff; --text:#000000; --border:#ffe500; --accent:#fffc00; }
  :global([data-theme="slack"]){ --bg:#350d36; --card:#ffffff; --text:#1d1c1d; --border:#522653; --accent:#1264a3; }
  :global([data-theme="messenger"]){ --bg:#f0f8ff; --card:#ffffff; --text:#050505; --border:#c2d9ff; --accent:#0099ff; }
  :global([data-theme="twitter"]){ --bg:#000000; --card:#16181c; --text:#e7e9ea; --border:#2f3336; --accent:#1d9bf0; }
  :global([data-theme="minimal"]){ --bg:#fefefe; --card:#ffffff; --text:#111111; --border:#eeeeee; --accent:#111111; }
  :global(html){ background:var(--bg)!important; color:var(--text)!important; }
  :global(body){ background:var(--bg)!important; color:var(--text)!important; transition: background 0.25s, color 0.25s; }
</style>