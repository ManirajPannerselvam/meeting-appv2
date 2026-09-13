<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let template: any;
  export let currentUser: any;
  export let currentUserEmail: string = '';

  const dispatch = createEventDispatcher();
  let toEmail = '';
  let role = 'viewer'; // viewer | editor | indirect_owner
  let loading = false;
  let shares: any[] = [];
  let pending: any[] = [];
  let activeTab: 'share' | 'access' | 'approvals' = 'share';

  let isMainOwner = false;
  $: {
    isMainOwner = template?.owner_id === currentUser?.id || template?.main_owner_id === currentUser?.id || !template?.main_owner_id;
  }

  async function loadShares(){
    const res = await fetch(`/api/templates/share?template_id=${template.id}`);
    const j = await res.json();
    shares = j.shares || [];
  }
  async function loadPending(){
    if(!isMainOwner) return;
    const res = await fetch(`/api/templates/approve?owner_id=${currentUser.id}`);
    const j = await res.json();
    pending = j.pending || [];
  }

  async function handleShare(){
    if(!toEmail.trim()) return alert('Enter email');
    if(toEmail.toLowerCase() === currentUserEmail.toLowerCase()) return alert('Cannot share to self');
    
    // Rule: only main owner can give indirect_owner
    if(role === 'indirect_owner' && !isMainOwner){
      alert('Only Main Owner can give Owner role. You can only give Viewer.');
      role = 'viewer';
      return;
    }

    loading = true;
    try{
      const res = await fetch('/api/templates/share',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          template_id: template.id,
          template_code: template.template_code,
          from_user_id: currentUser.id,
          from_email: currentUserEmail,
          to_email: toEmail,
          role
        })
      });
      const j = await res.json();
      if(!res.ok) throw new Error(j.error);
      alert(j.message);
      toEmail = '';
      await loadShares();
      dispatch('shared');
    }catch(e:any){ alert(e.message); }
    finally{ loading = false; }
  }

  async function handleApprove(share_id: string, action: string, newRole?: string){
    loading = true;
    try{
      const res = await fetch('/api/templates/approve',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ share_id, approver_id: currentUser.id, action, new_role: newRole })
      });
      const j = await res.json();
      if(!res.ok) throw new Error(j.error);
      alert(j.message);
      await loadPending();
      await loadShares();
    }catch(e:any){ alert(e.message); }
    finally{ loading = false; }
  }

  import { onMount } from 'svelte';
  onMount(()=>{ loadShares(); loadPending(); });
</script>

<div class="share-wrap">
  <div class="tabs">
    <button class:active={activeTab==='share'} onclick={()=>activeTab='share'}>Share</button>
    <button class:active={activeTab==='access'} onclick={()=>{activeTab='access'; loadShares();}}>Access ({shares.length})</button>
    {#if isMainOwner}
      <button class:active={activeTab==='approvals'} onclick={()=>{activeTab='approvals'; loadPending();}}>Approvals {#if pending.length}<span class="badge">{pending.length}</span>{/if}</button>
    {/if}
  </div>

  {#if activeTab==='share'}
    <div class="form">
      <h4>Share "{template.name}"</h4>
      {#if isMainOwner}
        <p class="hint">You are Main Owner. You can add Owner / Editor / Viewer</p>
      {:else}
        <p class="hint">You are Indirect Owner. Share needs Main Owner approval. You can only give Viewer access.</p>
      {/if}
      <input type="email" bind:value={toEmail} placeholder="user email to share" class="inp" />
      <select bind:value={role} class="inp" disabled={!isMainOwner}>
        <option value="viewer">Viewer - Can use template</option>
        <option value="editor">Editor - Can edit values</option>
        {#if isMainOwner}<option value="indirect_owner">Owner (Indirect) - Can share + use</option>{/if}
      </select>
      <button class="btn-primary" onclick={handleShare} disabled={loading}>{loading ? 'Sharing...' : isMainOwner ? 'Add Owner' : 'Request Share'}</button>
    </div>
  {/if}

  {#if activeTab==='access'}
    <div class="list">
      <div class="row head"><span>Email</span><span>Role</span><span>Status</span></div>
      {#each shares as s}
        <div class="row"><span>{s.to_email}</span><span class="role {s.role}">{s.role}</span><span class="status {s.status}">{s.status}</span></div>
      {:else}<p class="empty">No shared users</p>{/each}
      {#if template.owner_chain}
        <h5 style="margin-top:12px;">Owner Chain</h5>
        {#each template.owner_chain as c}
          <div class="row"><span>{c.email}</span><span class="role {c.role}">{c.role} L{c.level}</span><span>approved</span></div>
        {/each}
      {/if}
    </div>
  {/if}

  {#if activeTab==='approvals' && isMainOwner}
    <div class="list">
      {#each pending as p}
        <div class="pending-card">
          <div><b>{p.from_email}</b> wants to share <b>{p.templates?.name} ({p.template_code})</b> to <b>{p.to_email}</b> as {p.role}</div>
          <div class="actions">
            <select id="role-{p.id}" class="inp-sm">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="indirect_owner">Indirect Owner</option>
            </select>
            <button class="btn-approve" onclick={()=>{ const sel = document.getElementById('role-'+p.id); handleApprove(p.id,'approved', sel?.value || p.role); }}>Approve</button>
            <button class="btn-reject" onclick={()=>handleApprove(p.id,'rejected')}>Reject</button>
          </div>
        </div>
      {:else}<p class="empty">No pending approvals</p>{/each}
    </div>
  {/if}
</div>

<style>
  .share-wrap{padding:12px;background:#111b21;color:#e9edef;border-radius:12px;max-width:480px;width:100%;}
  .tabs{display:flex;gap:6px;margin-bottom:12px;border-bottom:1px solid #2a3942;padding-bottom:8px;}
  .tabs button{background:#202c33;color:#8696a0;border:none;padding:6px 12px;border-radius:20px;cursor:pointer;font-size:13px;}
  .tabs button.active{background:#00a884;color:white;}
  .badge{background:red;color:white;border-radius:50%;padding:2px 6px;font-size:10px;margin-left:4px;}
  .form{display:flex;flex-direction:column;gap:10px;}
  .hint{font-size:11px;color:#8696a0;background:#202c33;padding:6px 8px;border-radius:6px;}
  .inp{background:#202c33;border:1px solid #2a3942;color:white;padding:10px;border-radius:8px;}
  .inp-sm{background:#202c33;border:1px solid #2a3942;color:white;padding:6px;border-radius:6px;font-size:12px;}
  .btn-primary{background:#00a884;color:white;border:none;padding:10px;border-radius:8px;font-weight:700;cursor:pointer;}
  .list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto;}
  .row{display:flex;justify-content:space-between;gap:8px;padding:8px;background:#202c33;border-radius:6px;font-size:12px;}
  .row.head{background:transparent;color:#8696a0;font-weight:700;}
  .role.indirect_owner{color:#00a884;font-weight:700;} .role.editor{color:#fbbf24;} .role.viewer{color:#8696a0;}
  .status.approved{color:#00a884;} .status.pending{color:#fbbf24;} .status.rejected{color:#f87171;}
  .pending-card{background:#202c33;padding:10px;border-radius:8px;display:flex;flex-direction:column;gap:8px;font-size:13px;}
  .actions{display:flex;gap:6px;align-items:center;}
  .btn-approve{background:#00a884;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;}
  .btn-reject{background:#2a3942;color:#e9edef;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;}
  .empty{color:#8696a0;font-size:13px;text-align:center;padding:20px;}
</style>
