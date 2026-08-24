<script lang="ts">
  export let show = true;
</script>

{#if show}
<div class="loader-overlay">
  <div class="handshake-container">
    <div class="hand left">🤝</div>
    <div class="hand right">🤝</div>
    <!-- Better animated version -->
    <div class="hands-animation">
      <span class="hand-emoji hand-left">🫱</span>
      <span class="hand-emoji hand-right">🫲</span>
    </div>
    <div class="text">
      <span class="dot">O</span><span class="dot">R</span><span class="dot">G</span>
    </div>
    <div class="subtext">Connecting...</div>
    <div class="progress-bar"><div class="progress"></div></div>
  </div>
</div>
{/if}

<style>
.loader-overlay{
  position:fixed; inset:0; z-index:9999;
  background:#111827; display:flex;
  align-items:center; justify-content:center;
}
.handshake-container{ display:flex; flex-direction:column; align-items:center; gap:12px; }

.hands-animation{
  display:flex; align-items:center; justify-content:center;
  gap:0px; font-size:60px; position:relative;
  width:120px; height:80px;
}
.hand-emoji{ position:absolute; display:inline-block; }

.hand-left{
  animation: shakeLeft 1.2s ease-in-out infinite;
  left:5px;
  transform-origin: right center;
}
.hand-right{
  animation: shakeRight 1.2s ease-in-out infinite;
  right:5px;
  transform-origin: left center;
}

@keyframes shakeLeft{
  0%,100%{ transform: translateX(0) rotate(0deg); }
  20%{ transform: translateX(12px) rotate(-5deg); }
  40%{ transform: translateX(18px) rotate(0deg); }
  60%{ transform: translateX(12px) rotate(-5deg); }
  80%{ transform: translateX(0) rotate(0deg); }
}
@keyframes shakeRight{
  0%,100%{ transform: translateX(0) rotate(0deg); }
  20%{ transform: translateX(-12px) rotate(5deg); }
  40%{ transform: translateX(-18px) rotate(0deg); }
  60%{ transform: translateX(-12px) rotate(5deg); }
  80%{ transform: translateX(0) rotate(0deg); }
}

.text{
  display:flex; gap:4px; color:#22c55e;
  font-weight:800; font-size:22px; letter-spacing:4px;
  margin-top:10px;
}
.dot{ animation: bounce 1s ease-in-out infinite; }
.dot:nth-child(2){ animation-delay:0.15s; }
.dot:nth-child(3){ animation-delay:0.3s; }

@keyframes bounce{
  0%,100%{ transform:translateY(0); opacity:1; }
  50%{ transform:translateY(-6px); opacity:0.8; }
}

.subtext{ color:#6b7280; font-size:13px; margin-top:2px; }

.progress-bar{
  width:120px; height:3px; background:#1f2937;
  border-radius:10px; overflow:hidden; margin-top:10px;
}
.progress{
  height:100%; width:40%;
  background:linear-gradient(90deg, #22c55e, #16a34a);
  border-radius:10px;
  animation: progressMove 1.2s ease-in-out infinite;
}

@keyframes progressMove{
  0%{ transform:translateX(-100%); }
  100%{ transform:translateX(300%); }
}

/* Hide handshake emojis fallback */
.hand{ display:none; }
</style>