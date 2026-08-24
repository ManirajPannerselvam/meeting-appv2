<script lang="ts">
  export let title = "";
  export let subtitle = "";
  export let avatarUrl = "";
  export let showBack = false;
  export let onBack: () => void = () => {};

  let showMenu = false;
  let showSearch = false;

  function getInitials(n: string) {
    return n?.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'C';
  }

  // FIX 4 - click outside to hide menu
  function clickOutside(node: HTMLElement, cb: () => void) {
    const handle = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) cb();
    };
    document.addEventListener('click', handle, true);
    return {
      destroy() { document.removeEventListener('click', handle, true); }
    };
  }

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    showMenu =!showMenu;
  }
</script>

<div class="chat-top-bar">
  <div class="left">
    {#if showBack}
      <button class="back-btn" on:click={onBack} aria-label="Back">←</button>
    {/if}
    <div class="top-avatar">
      {#if avatarUrl}
        <img src={avatarUrl} alt="" />
      {:else}
        {getInitials(title)}
      {/if}
    </div>
    <div class="top-info">
      <div class="top-name">{title}</div>
      <div class="top-sub">{subtitle || 'click here for contact info'}</div>
    </div>
  </div>

  <div class="right">
    <button class="top-icon" on:click={() => showSearch =!showSearch} aria-label="Search">🔍</button>

    <div class="menu-wrap" use:clickOutside={() => showMenu = false}>
      <button class="top-icon" on:click={toggleMenu} aria-label="Menu">⋮</button>

      {#if showMenu}
        <div class="dropdown">
          <button class="dropdown-item" on:click={() => { showMenu = false; alert('Contact info: ' + title); }}>Contact info</button>
          <button class="dropdown-item" on:click={() => { showMenu = false; }}>Mute notifications</button>
          <button class="dropdown-item" on:click={() => { showMenu = false; }}>Clear chat</button>
          <button class="dropdown-item danger" on:click={() => { showMenu = false; }}>Block</button>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if showSearch}
  <div class="search-bar">
    <input placeholder="Search messages..." autofocus />
    <button on:click={() => showSearch = false}>✕</button>
  </div>
{/if}

<style>
.chat-top-bar{
  height:64px;
  background:linear-gradient(90deg, #202c33 0%, #2a3942 100%);
  border-left:1px solid #2a3942;
  border-bottom:1px solid #2a3942;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 16px;
  position:relative;
}
.left{ display:flex; align-items:center; gap:12px; min-width:0; flex:1; }
.top-avatar{
  width:42px; height:42px; border-radius:50%;
  background:linear-gradient(135deg, #00a884, #008069);
  color:white; display:flex; align-items:center; justify-content:center;
  font-weight:700; font-size:15px; overflow:hidden; flex-shrink:0;
}
.top-avatar img{ width:100%; height:100%; object-fit:cover; }
.top-info{ display:flex; flex-direction:column; min-width:0; flex:1; }
.top-name{ color:#ffffff; font-size:16px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.top-sub{ color:#8696a0; font-size:12.5px; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.right{ display:flex; gap:4px; align-items:center; flex-shrink:0; }

.top-icon{
  width:36px; height:36px; border:none;
  background:transparent; color:#aebac1;
  font-size:18px; border-radius:50%; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.top-icon:hover{ background:#374045; color:#fff; }

.back-btn{
  width:36px; height:36px; border:none;
  background:transparent; color:#fff;
  font-size:22px; border-radius:50%;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  margin-right:2px;
}
.back-btn:hover{ background:#374045; }

.menu-wrap{ position:relative; }

.dropdown{
  position:absolute; right:0; top:44px;
  background:#233138; border-radius:8px;
  box-shadow:0 8px 24px rgba(0,0,0,0.5);
  min-width:200px; z-index:100;
  overflow:hidden; border:1px solid #2a3942;
}
.dropdown-item{
  width:100%; padding:12px 16px;
  background:none; border:none;
  color:#e9edef; text-align:left;
  font-size:14px; cursor:pointer;
}
.dropdown-item:hover{ background:#2a3942; }
.dropdown-item.danger{ color:#f15c6d; }

.search-bar{
  height:48px; background:#202c33;
  display:flex; align-items:center;
  padding:0 16px; gap:8px;
  border-bottom:1px solid #2a3942;
}
.search-bar input{
  flex:1; background:#2a3942; border:none;
  color:#e9edef; padding:8px 12px;
  border-radius:8px; outline:none;
}
.search-bar button{
  background:none; border:none;
  color:#8696a0; font-size:18px; cursor:pointer;
}
</style>