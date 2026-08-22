<script lang="ts">
  export let title=""; export let subtitle=""; export let avatarUrl="";
  function getInitials(n:string){ return n?.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()||'C'; }
</script>

<div class="chat-top-bar">
  <div class="left">
    <div class="top-avatar">{#if avatarUrl}<img src={avatarUrl} alt=""/>{:else}{getInitials(title)}{/if}</div>
    <div class="top-info">
      <div class="top-name">{title}</div>
      <div class="top-sub">{subtitle||'click here for contact info'}</div>
    </div>
  </div>
  <div class="right">
    <button class="top-icon">🔍</button>
    <button class="top-icon">⋮</button>
  </div>
</div>

<style>
.chat-top-bar{ height:64px; background:linear-gradient(90deg, #202c33 0%, #2a3942 100%); border-left:1px solid #2a3942; border-bottom:1px solid #2a3942; display:flex; align-items:center; justify-content:space-between; padding:0 20px; }
.left{ display:flex; align-items:center; gap:14px; min-width:0; }
.top-avatar{ width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg, #00a884, #008069); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; overflow:hidden; }
.top-avatar img{ width:100%; height:100%; object-fit:cover; }
.top-info{ display:flex; flex-direction:column; min-width:0; }
.top-name{ color:#ffffff; font-size:16px; font-weight:600; letter-spacing:0.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.top-sub{ color:#8696a0; font-size:12.5px; font-weight:400; margin-top:1px; }
.right{ display:flex; gap:8px; }
.top-icon{ width:36px; height:36px; border:none; background:transparent; color:#aebac1; font-size:18px; border-radius:50%; cursor:pointer; }
.top-icon:hover{ background:#374045; color:#fff; }
</style>