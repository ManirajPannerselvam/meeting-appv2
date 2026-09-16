<script lang="ts">
let { src, duration=0 } = $props();
let audio: HTMLAudioElement|undefined = $state();
let playing=$state(false);
let cur=$state(0);
let dur=$state(duration||0);

function fmt(s:number){ const m=Math.floor(s/60); const sec=Math.floor(s%60); return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

function toggle(){
  if(!audio) return;
  if(playing){ audio.pause(); } else { audio.play().catch(()=>{}); }
}
function onTime(){ if(audio) cur=audio.currentTime; }
function onLoaded(){ if(audio){ dur=audio.duration||duration; } }
function onEnded(){ playing=false; cur=0; }
</script>

<div class="voice-bubble">
  <button type="button" class="play" onclick={toggle}>{#if playing}⏸{:else}▶{/if}</button>
  <div class="wave">
    <div class="bar" style="width:{dur? Math.min(100, (cur/dur)*100):0}%"></div>
  </div>
  <span class="time">{fmt(playing?cur:dur)}</span>
  <audio bind:this={audio} src={src} ontimeupdate={onTime} onloadedmetadata={onLoaded} onended={onEnded} onplay={()=>playing=true} onpause={()=>playing=false} preload="metadata"></audio>
</div>

<style>
.voice-bubble{display:flex;align-items:center;gap:8px;background:#202c33;border-radius:16px;padding:6px 10px;min-width:180px;max-width:240px;}
.play{width:32px;height:32px;border-radius:50%;border:none;background:#00a884;color:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.wave{flex:1;height:24px;background:#2a3942;border-radius:10px;position:relative;overflow:hidden;display:flex;align-items:center;}
.bar{height:100%;background:#00a884;position:absolute;left:0;top:0;transition:width 0.1s linear;}
.time{font-size:10px;color:#8696a0;min-width:32px;text-align:right;}
</style>