<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto, preloadData } from '$app/navigation';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase/client';

  let online = true;
  let rtt: number | null = null;
  let downlink: any = null;
  let showNet = false;

  const modules = ['/', '/chat', '/reports', '/dashboard', '/templates'];
  let startX = 0; let startY = 0; let startTime = 0; let isSwiping = false;

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
    if(['button','input','select','textarea','a','canvas'].includes(tag)) return true;
    if(target.closest('button, input, select, textarea, a, .table-wrapper, table, canvas, [data-no-swipe], .globe-canvas, .theme-grid, .chat-input-wrapper, .attach-menu, .emoji-picker')) return true;
    return false;
  }
  function onTouchStart(e: TouchEvent){
    if(shouldIgnoreSwipe(e.target)) { isSwiping = false; return; }
    const path = $page.url.pathname;
    if(path.startsWith('/settings') || path.startsWith('/login')) { isSwiping = false; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; startTime = Date.now(); isSwiping = true;
  }
  function onTouchEnd(e: TouchEvent){
    if(!isSwiping) return; isSwiping = false;
    const endX = e.changedTouches[0].clientX; const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX; const diffY = endY - startY;
    if(Math.abs(diffX) < 100 || Math.abs(diffY) > 80 || Date.now() - startTime > 600) return;
    if($page.url.pathname.startsWith('/chat') && diffX > 100 && startX < 50){
      goto('/chat', { keepFocus:true, noScroll:true });
      return;
    }
    let idx = getModuleIndex($page.url.pathname);
    if(diffX < -100) goto(modules[(idx + 1) % modules.length], { keepFocus:true });
    else if(diffX > 100) goto(modules[(idx - 1 + modules.length) % modules.length], { keepFocus:true });
  }

  function applyThemeFromStorage(){
    if(!browser) return;
    let saved = 'whatsapp';
    try{ saved = localStorage.getItem('ems_theme') || localStorage.getItem('app-theme') || 'whatsapp'; }catch{}
    let t = saved.toLowerCase();
    if(t==='system'){
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      t = isDark? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-social-theme', 'system');
    } else {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-social-theme', t);
      try{ localStorage.setItem('ems_theme', t); localStorage.setItem('app-theme', t); }catch{}
    }
    const isDarkTheme = ['dark','whatsapp','discord','twitter','slack'].includes(t);
    document.documentElement.style.colorScheme = isDarkTheme ? 'dark' : 'light';
  }

  async function loadThemeFromSettings(){
    if(!browser) return;
    try{
      const { data } = await supabase.from('settings').select('appearance').eq('id',1).maybeSingle();
      if(data?.appearance?.theme){
        try{ localStorage.setItem('ems_theme', data.appearance.theme); localStorage.setItem('app-theme', data.appearance.theme); }catch{}
        applyThemeFromStorage();
      }
    }catch{}
  }

  function preloadInBackground(){
    if(!browser) return;
    // ✅ FAST: light queries only
    Promise.allSettled([
      supabase.from('contacts').select('id').limit(1).then(()=>{}).catch(()=>{}),
      supabase.from('settings').select('id').limit(1).then(()=>{}).catch(()=>{}),
    ]);
    // ✅ SPEED: prefetch reports + settings so bottom nav instant
    setTimeout(()=>{
      try{
        preloadData('/reports');
        preloadData('/settings');
        preloadData('/chat');
      }catch{}
    }, 800);
  }

  onMount(() => {
    if(!browser) return;
    applyThemeFromStorage();
    setTimeout(()=>{ loadThemeFromSettings(); }, 300);
    const idle = (window as any).requestIdleCallback || ((cb:any)=> setTimeout(cb, 1200));
    idle(()=> preloadInBackground());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = ()=>{
      const raw = localStorage.getItem('ems_theme') || localStorage.getItem('app-theme');
      if(raw?.toLowerCase()==='system') applyThemeFromStorage();
    };
    mediaQuery.addEventListener('change', handleThemeChange);

    online = navigator.onLine;
    const conn: any = (navigator as any).connection;
    let connListener: any = null;
    if(conn){ 
      rtt = conn.rtt; downlink = conn.downlink; 
      connListener = ()=>{ rtt = conn.rtt; downlink = conn.downlink; };
      conn.addEventListener('change', connListener); 
    }
    const onOnline = ()=> online = true;
    const onOffline = ()=> online = false;
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('touchstart', onTouchStart, { passive: true } as any);
    window.addEventListener('touchend', onTouchEnd, { passive: true } as any);

    return ()=>{
      mediaQuery.removeEventListener('change', handleThemeChange);
      if(conn && connListener) conn.removeEventListener('change', connListener);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
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

<div class="swipe-root"><slot /></div>

<style>
.net-bar{ height:24px; background:#111b21; color:#aebac1; display:flex; gap:12px; align-items:center; padding:0 12px; font-size:11px; font-family:monospace; border-bottom:1px solid #222d34; position:sticky; top:0; z-index:999; }
.net-bar.offline{ background:#5a1a1a; color:#ffb4b4; }
.net-close{ margin-left:auto; background:transparent; border:none; color:inherit; cursor:pointer; }
.swipe-root{ min-height:100vh; touch-action: auto; }
:global(html){ background:var(--bg)!important; color:var(--text)!important; }
:global(body){ background:var(--bg)!important; color:var(--text)!important; margin:0; }
:global(.user-dropdown), :global(.dropdown-menu){
  background:#ffffff !important; color:#111827 !important;
  border:1px solid #e5e7eb !important;
  box-shadow:0 10px 25px rgba(0,0,0,0.15) !important;
  border-radius:10px !important; overflow:hidden !important;
}
:global(.user-dropdown *){ color:#111827 !important; }
:global(.user-dropdown a){ display:flex !important; align-items:center; gap:8px; padding:12px 14px !important; color:#111827 !important; font-size:14px !important; font-weight:600 !important; }
:global(.user-dropdown a:hover){ background:#f3f4f6 !important; }
:global(.globe-canvas), :global(canvas){ touch-action: none !important; pointer-events: auto !important; }
:global(.preview-area label){ color:#111827 !important; font-weight:800 !important; }
:global(.preview-area input){ background:#ffffff !important; color:#111827 !important; border:1.5px solid #94a3b8 !important; }
</style>