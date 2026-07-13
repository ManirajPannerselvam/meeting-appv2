<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { supabase } from '$lib/supabase';

    export let groups: any[] = [];
    export let contacts: any[] = [];
    export let selectedGroup: any = null;
    export let selectedContact: any = null;

    const dispatch = createEventDispatcher();

    let searchQuery = '';
    let activeTab: 'chats' | 'contacts' = 'chats';

    $: filteredContacts = contacts.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile?.includes(searchQuery)
    );

    $: filteredGroups = groups.filter(g => 
        g.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    function handleSelectContact(contact: any) {
        dispatch('selectContact', contact);
    }

    function handleSelectGroup(group: any) {
        dispatch('selectGroup', group);
    }

    function handleNewGroup() {
        dispatch('newGroup');
    }

    function handleNewContact() {
        dispatch('newContact');
    }
</script>

<aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
        <h2>Chats</h2>
        <div class="header-actions">
            <button class="icon-btn" on:click={handleNewContact} title="New Contact">
                👤+
            </button>
            <button class="icon-btn" on:click={handleNewGroup} title="New Group">
                👥+
            </button>
        </div>
    </div>

    <!-- Search -->
    <div class="search-box">
        <input 
            type="text" 
            bind:value={searchQuery}
            placeholder="Search contacts..."
        />
    </div>

    <!-- Tabs -->
    <div class="tabs">
        <button 
            class:active={activeTab === 'chats'}
            on:click={() => activeTab = 'chats'}
        >
            Chats
        </button>
        <button 
            class:active={activeTab === 'contacts'}
            on:click={() => activeTab = 'contacts'}
        >
            Contacts
        </button>
    </div>

    <!-- List -->
    <div class="list">
        {#if activeTab === 'chats'}
            {#each filteredContacts as contact (contact.room_id)}
                <button 
                    class="list-item"
                    class:active={selectedContact?.room_id === contact.room_id}
                    on:click={() => handleSelectContact(contact)}
                >
                    <div class="avatar">
                        {contact.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div class="info">
                        <div class="name">{contact.name || 'Unknown'}</div>
                        <div class="subtitle">{contact.mobile || ''}</div>
                    </div>
                </button>
            {/each}
            
            {#if filteredContacts.length === 0}
                <div class="empty-state">
                    <p>No contacts yet</p>
                    <button on:click={handleNewContact}>Add Contact</button>
                </div>
            {/if}
        {:else}
            {#each filteredGroups as group (group.id)}
                <button 
                    class="list-item"
                    class:active={selectedGroup?.id === group.id}
                    on:click={() => handleSelectGroup(group)}
                >
                    <div class="avatar group">
                        {group.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div class="info">
                        <div class="name">{group.name || 'Unknown'}</div>
                        <div class="subtitle">{group.description || ''}</div>
                    </div>
                </button>
            {/each}

            {#if filteredGroups.length === 0}
                <div class="empty-state">
                    <p>No groups yet</p>
                    <button on:click={handleNewGroup}>Create Group</button>
                </div>
            {/if}
        {/if}
    </div>
</aside>

<style>
    .sidebar {
        width: 320px;
        background: white;
        border-right: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .sidebar-header h2 {
        margin: 0;
        font-size: 20px;
    }

    .header-actions {
        display: flex;
        gap: 8px;
    }

    .icon-btn {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
    }

    .icon-btn:hover {
        background: #f3f4f6;
    }

    .search-box {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
    }

    .search-box input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        outline: none;
    }

    .tabs {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
    }

    .tabs button {
        flex: 1;
        padding: 12px;
        border: none;
        background: none;
        cursor: pointer;
        font-weight: 500;
        color: #6b7280;
    }

    .tabs button.active {
        color: #2563eb;
        border-bottom: 2px solid #2563eb;
    }

    .list {
        flex: 1;
        overflow-y: auto;
    }

    .list-item {
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: none;
        display: flex;
        gap: 12px;
        align-items: center;
        cursor: pointer;
        text-align: left;
        border-bottom: 1px solid #f3f4f6;
    }

    .list-item:hover {
        background: #f9fafb;
    }

    .list-item.active {
        background: #eff6ff;
    }

    .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #3b82f6;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 18px;
        flex-shrink: 0;
    }

    .avatar.group {
        background: #10b981;
    }

    .info {
        flex: 1;
        min-width: 0;
    }

    .name {
        font-weight: 600;
        color: #111827;
        margin-bottom: 2px;
    }

    .subtitle {
        font-size: 13px;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: #6b7280;
    }

    .empty-state button {
        margin-top: 12px;
        padding: 8px 16px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }
</style>