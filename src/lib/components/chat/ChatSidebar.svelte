<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let groups: any[] = [];
    export let contacts: any[] = [];
    export let selectedGroup: any = null;
    export let selectedContact: any = null;

    const dispatch = createEventDispatcher();

    let search = "";
    let showMenu = false;
    let showContextMenu = false;
    let contextItem: any = null;
    let contextType: 'contact' | 'group' | null = null;

    $: filteredContacts = contacts.filter((c: any) =>
     !search ||
        (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.mobile || "").includes(search)
    );

    $: filteredGroups = groups.filter((g: any) =>
     !search ||
        (g.name || "").toLowerCase().includes(search.toLowerCase())
    );

    // 2. 9-grid icon: FIXED - Single letter for contacts, 9-grid for groups
    function getGridItems(name: string, members?: any[]) {
        if (members && members.length > 1) {
            // Group: show up to 9 member initials
            return members.slice(0, 9).map(m => (m.name?.[0] || '?').toUpperCase());
        }
        // Contact: just first letter, big
        return [(name?.[0] || '?').toUpperCase()];
    }

    // Generate consistent colors
    function getColor(index: number) {
        const hue = (index * 47) % 360; // Spread colors better
        return `hsl(${hue}, 65%, 55%)`;
    }

    // Format time like Image 1: "7:02 AM", "yesterday", "Mon"
    function formatTime(timestamp: string | number) {
        if (!timestamp) return 'yesterday';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else if (days === 1) {
            return 'yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    }

    function handleSelectContact(contact: any) {
        dispatch("selectContact", contact);
        showMenu = false;
    }

    function handleSelectGroup(group: any) {
        dispatch("selectGroup", group);
        showMenu = false;
    }

    // 5. Long press for delete/edit/image
    let pressTimer: any;
    let isLongPress = false;

    function handleLongPress(item: any, type: 'contact' | 'group') {
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            contextItem = item;
            contextType = type;
            showContextMenu = true;
        }, 600);
    }

    function clearPressTimer() {
        clearTimeout(pressTimer);
    }

    function handleClick(item: any, type: 'contact' | 'group') {
        if (!isLongPress) {
            if (type === 'contact') handleSelectContact(item);
            else handleSelectGroup(item);
        }
        isLongPress = false;
    }

    function handleContextAction(action: string) {
        if (!contextItem ||!contextType) return;

        if (action === 'delete') {
            if (confirm(`Delete ${contextItem.name}?`)) {
                dispatch(contextType === 'contact'? "deleteContact" : "deleteGroup", contextItem);
            }
        } else if (action === 'edit') {
            dispatch(contextType === 'contact'? "editContact" : "editGroup", contextItem);
        } else if (action === 'image') {
            dispatch(contextType === 'contact'? "addContactImage" : "addGroupImage", contextItem);
        }

        showContextMenu = false;
        contextItem = null;
        contextType = null;
    }

    function closeMenu(e: MouseEvent) {
        if (!(e.target as HTMLElement).closest('.menu-wrap')) {
            showMenu = false;
        }
        if (!(e.target as HTMLElement).closest('.context-popup')) {
            showContextMenu = false;
        }
    }
</script>

<svelte:window on:click={closeMenu}/>

<div class="sidebar">

    <!-- HEADER: Blue like Image 1, 1. ONLINE STATUS REMOVED -->
    <div class="header">
        <div class="left">
            <span class="title">Chats</span>
        </div>
        <div class="menu-wrap">
            <button class="icon-btn" on:click|stopPropagation={() => showMenu =!showMenu}>⋮</button>
            {#if showMenu}
                <div class="dropdown">
                    <button on:click={() => { dispatch("newContact"); showMenu = false; }}>+ Contact</button>
                    <button on:click={() => { dispatch("newGroup"); showMenu = false; }}>+ Group</button>
                </div>
            {/if}
        </div>
    </div>

    <div class="search">
        <input
            bind:value={search}
            placeholder="Search contact or group..."
        />
    </div>

    <!-- COMBINED LIST: Groups + Contacts in single list like Image 1 -->
    <div class="chat-list">
        {#if filteredGroups.length === 0 && filteredContacts.length === 0}
            <div class="empty">No Chats</div>
        {:else}
            <!-- Groups first -->
            {#each filteredGroups as group (group.id)}
                {@const gridItems = getGridItems(group.name, group.members)}
                <div
                    class="chat-row"
                    class:selected={selectedGroup?.id === group.id}
                    on:click={() => handleClick(group, 'group')}
                    on:mousedown={() => handleLongPress(group, 'group')}
                    on:mouseup={clearPressTimer}
                    on:mouseleave={clearPressTimer}
                    on:touchstart={() => handleLongPress(group, 'group')}
                    on:touchend={clearPressTimer}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => e.key === 'Enter' && handleClick(group, 'group')}
                >
                    <div class="avatar-wrap">
                        <div class="avatar-grid" class:single={gridItems.length === 1}>
                            {#if gridItems.length === 1}
                                <div class="mini single-letter" style="background: {getColor(0)}">
                                    {gridItems[0]}
                                </div>
                            {:else}
                                {#each gridItems as initial, i}
                                    <div class="mini" style="background: {getColor(i)}">{initial}</div>
                                {/each}
                                <!-- Fill empty cells -->
                                {#each Array(9 - gridItems.length) as _, i}
                                    <div class="mini empty"></div>
                                {/each}
                            {/if}
                        </div>
                        {#if group.unread}
                            <div class="badge">{group.unread > 99? '99+' : group.unread}</div>
                        {/if}
                    </div>

                    <div class="content">
                        <div class="name">{group.name}</div>
                        <div class="msg">{group.lastMsg || 'Group Chat'}</div>
                    </div>

                    <div class="time">{formatTime(group.time || group.updated_at)}</div>
                </div>
            {/each}

            <!-- Contacts -->
            {#each filteredContacts as contact (contact.id)}
                {@const gridItems = getGridItems(contact.name)}
                <div
                    class="chat-row"
                    class:selected={selectedContact?.id === contact.id}
                    on:click={() => handleClick(contact, 'contact')}
                    on:mousedown={() => handleLongPress(contact, 'contact')}
                    on:mouseup={clearPressTimer}
                    on:mouseleave={clearPressTimer}
                    on:touchstart={() => handleLongPress(contact, 'contact')}
                    on:touchend={clearPressTimer}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => e.key === 'Enter' && handleClick(contact, 'contact')}
                >
                    <div class="avatar-wrap">
                        <div class="avatar-grid single">
                            <div class="mini single-letter" style="background: {getColor(0)}">
                                {gridItems[0]}
                            </div>
                        </div>
                        {#if contact.unread}
                            <div class="badge">{contact.unread > 99? '99+' : contact.unread}</div>
                        {/if}
                    </div>

                    <div class="content">
                        <div class="name">{contact.name}</div>
                        <div class="msg">{contact.lastMsg || contact.mobile || ''}</div>
                    </div>

                    <div class="time">{formatTime(contact.time || contact.updated_at)}</div>
                </div>
            {/each}
        {/if}
    </div>

</div>

<!-- 5. CONTEXT MENU: Delete/Edit/Add Image like WhatsApp -->
{#if showContextMenu && contextItem}
<div class="context-overlay">
    <div class="context-popup">
        <div class="context-title">{contextItem.name}</div>
        <button on:click={() => handleContextAction('edit')}>Edit</button>
        <button on:click={() => handleContextAction('image')}>Add Image</button>
        <button class="delete" on:click={() => handleContextAction('delete')}>Delete</button>
        <button on:click={() => showContextMenu = false}>Cancel</button>
    </div>
</div>
{/if}

<style>
.sidebar{
    display:flex;
    flex-direction:column;
    height:100%;
    background:#fff;
}

/* HEADER: Blue bar like Image 1 */
.header{
    background: #3b82f6;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    position: sticky;
    top: 0;
    z-index: 10;
}

/* FIXED: Added space between.header and.left */
.header.left{
    display: flex;
    gap: 12px;
    font-size: 14px;
    align-items: center;
}

.title{
    font-size: 18px;
    font-weight: 600;
}

.icon-btn{
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    padding: 4px 8px;
    cursor: pointer;
}

.menu-wrap{
    position: relative;
}

.dropdown{
    position: absolute;
    right: 0;
    top: 32px;
    background: white;
    color: #333;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    min-width: 150px;
    z-index: 50;
}

.dropdown button{
    display: block;
    width: 100%;
    text-align: left;
    color: #333;
    padding: 12px 16px;
    font-size: 16px;
    background: none;
    border: none;
    cursor: pointer;
}

.dropdown button:hover{
    background: #f5f5f5;
}

.search{
    padding:10px 16px;
    background: white;
}

.search input{
    width:100%;
    padding:10px;
    border-radius:8px;
    border:1px solid #ddd;
    box-sizing:border-box;
    font-size: 14px;
}

.chat-list{
    flex: 1;
    overflow-y: auto;
    background: white;
}

/* CHAT ROW: Single line like Image 1 */
.chat-row{
    display: flex;
    align-items: center;
    padding: 10px 16px;
    gap: 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition:.1s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.chat-row:active{
    background: #f5f5f5;
}

.chat-row.selected{
    background: #e5f3ff;
}

.avatar-wrap{
    position: relative;
    flex-shrink: 0;
}

/* 2. 9-GRID ICON like Image 1 */
.avatar-grid{
    width: 48px;
    height: 48px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 1px;
    border-radius: 8px;
    overflow: hidden;
    background: #e5e7eb;
}

/* Single letter for contacts */
.avatar-grid.single{
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
}

.mini{
    color: white;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
}

.mini.single-letter{
    font-size: 20px;
}

.mini.empty{
    background: #e5e7eb!important;
}

/* Unread badge top-left like Image 1 */
.badge{
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: white;
    border-radius: 12px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.content{
    flex: 1;
    min-width: 0;
}

.name{
    font-size: 16px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #111b21;
    margin-bottom: 2px;
}

.msg{
    font-size: 14px;
    color: #667781;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.time{
    font-size: 12px;
    color: #667781;
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 2px;
}

.empty{
    padding: 40px 15px;
    color: #999;
    text-align: center;
}

/* 5. CONTEXT MENU for Edit/Delete/Image */
.context-overlay{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.context-popup{
    background: white;
    border-radius: 12px;
    min-width: 250px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.context-title{
    padding: 16px;
    font-weight: 600;
    border-bottom: 1px solid #eee;
    color: #111;
}

.context-popup button{
    display: block;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #333;
}

.context-popup button:hover{
    background: #f5f5f5;
}

.context-popup button.delete{
    color: #ef4444;
}
</style>