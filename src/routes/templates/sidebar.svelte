<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { currentUserId } from '$lib/stores/chat';
    
    const dispatch = createEventDispatcher();
    export let selectedId: string = ''; // to highlight active chat
    
    let groups: any[] = [];
    let contacts: any[] = [];
    let uid = '';
    let loading = true;
    
    currentUserId.subscribe(v => uid = v);
    
    onMount(async () => {
        if(!uid) return;
        loading = true;

        const { data: g } = await supabase.from('chat_groups').select('*').eq('created_by', uid).order('created_at', {ascending: false});
        groups = g || [];
        
        const { data: r } = await supabase
            .from('rooms')
            .select(`id, updated_at, user1_id, user2_id, user1:profiles!rooms_user1_id_fkey(id, name, avatar_url), user2:profiles!rooms_user2_id_fkey(id, name, avatar_url)`)
            .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
            .order('updated_at', {ascending: false});
        
        contacts = (r || []).map((room: any) => {
            const other = room.user1_id === uid ? room.user2 : room.user1;
            return { ...other, room_id: room.id, type: 'dm', updated_at: room.updated_at };
        });
        loading = false;
    });
</script>

<aside class="sidebar">
    <div class="sidebar-header"><h2>Chats</h2></div>
    <div class="chat-list">
        {#if loading}
            <p style="padding:16px; color:#999">Loading...</p>
        {:else}
            {#each groups as group}
                <div 
                    class="chat-item" 
                    class:active={selectedId === group.id}
                    on:click={() => dispatch('select', { ...group, type: 'group' })}
                >
                    <div class="avatar group">📁</div>
                    <div class="chat-info">
                        <div class="chat-name">{group.name}</div>
                        <div class="chat-sub">Group</div>
                    </div>
                </div>
            {/each}
            {#each contacts as contact}
                <div 
                    class="chat-item" 
                    class:active={selectedId === contact.room_id}
                    on:click={() => dispatch('select', contact)}
                >
                    <div class="avatar">
                        {#if contact.avatar_url}<img src={contact.avatar_url} alt=""/>{:else}👤{/if}
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">{contact.name}</div>
                        <div class="chat-sub">DM</div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</aside>

<style>
    .sidebar { width: 350px; background: white; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; height: 100vh; }
    .sidebar-header { padding: 20px; border-bottom: 1px solid #e5e7eb; }
    .sidebar-header h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .chat-list { overflow-y: auto; flex: 1; }
    .chat-item { display: flex; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f8f8f8; gap: 12px; align-items: center; }
    .chat-item:hover { background: #f5f5f5; }
    .chat-item.active { background: #eff6ff; }
    .avatar { font-size: 24px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 50%; overflow: hidden; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar.group { background: #dbeafe; }
    .chat-info { flex: 1; overflow: hidden; }
    .chat-name { font-weight: 600; font-size: 15px; }
    .chat-sub { font-size: 12px; color: #64748b; }
</style>