<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
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
    // Don't swipe when touching buttons, inputs, tables, canvas
    if(['button','input','select','textarea','a'].includes(tag)) return true;
    if(target.closest('button, input, select, textarea, a,.table-wrapper, [data-no-swipe]')) return true;
    return false;
  }

  function onTouchStart(e: TouchEvent){
    if(shouldIgnoreSwipe(e.target)) {
      isSwiping = false;
      return;
    }
    // Disable swipe on templates page (it has its own drag)
    if($page.url.pathname.startsWith('/templates')) {
      isSwiping = false;
      return;
    }
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

    // FIX: Increased threshold + velocity check
    // Need 120px horizontal, less than 50px vertical, and fast swipe < 400ms
    if(Math.abs(diffX) < 120) return;
    if(Math.abs(diffY) > 50) return;
    if(elapsed > 500) return; // slow drag = not a swipe, probably scroll
    if(Math.abs(diffX) < Math.abs(diffY) * 1.5) return; // must be mostly horizontal

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

  async function measureResponse(){
    if(!browser) return;
    const t0 = performance.now();
    try {
      await fetch('/api/ping', { method: 'HEAD', cache: 'no-store' }).catch(()=>fetch('/', { method:'HEAD', cache:'no-store' }));
      responseTime = Math.round(performance.now() - t0);
    } catch {
      responseTime = null;
    }
  }

  let interval: any;
  onMount(() => {
    if(!browser) return;
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
    measureResponse();
    interval = setInterval(measureResponse, 10000);
    window.addEventListener('touchstart', onTouchStart, { passive: true } as any);
    window.addEventListener('touchend', onTouchEnd, { passive: true } as any);
  });

  onDestroy(()=>{
    if(!browser) return;
    clearInterval(interval);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  });
</script>

{#if browser && showNet}
<div class="net-bar" class:offline={!online}>
  <span>{online? '● Online' : '○ Offline'}</span>
  {#if rtt!==null}<span>RTT {rtt}ms</span>{/if}
  {#if downlink}<span>{downlink}Mb/s</span>{/if}
  {#if responseTime!==null}<span>Resp {responseTime}ms</span>{/if}
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
</style>