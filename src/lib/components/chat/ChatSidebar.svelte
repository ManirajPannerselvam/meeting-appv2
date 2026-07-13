<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let groups: any[] = [];
    export let contacts: any[] = [];

    export let selectedGroup: any = null;
    export let selectedContact: any = null;

    const dispatch = createEventDispatcher();

    let search = "";

    $: filteredContacts = contacts.filter((c: any) =>
        !search ||
        (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.mobile || "").includes(search)
    );

    $: filteredGroups = groups.filter((g: any) =>
        !search ||
        (g.name || "").toLowerCase().includes(search.toLowerCase())
    );

    function handleSelectContact(contact: any) {
        dispatch("selectContact", contact);
    }

    function handleSelectGroup(group: any) {
        dispatch("selectGroup", group);
    }
</script>

<div class="sidebar">

    <div class="header">
        <h2>Chats</h2>
    </div>

    <div class="search">
        <input
            bind:value={search}
            placeholder="Search contact or group..."
        />
    </div>

    <div class="buttons">
        <button on:click={() => dispatch("newContact")}>
            + Contact
        </button>

        <button on:click={() => dispatch("newGroup")}>
            + Group
        </button>
    </div>

    <div class="section">
        <div class="section-title">
            Groups
        </div>

        {#if filteredGroups.length === 0}
            <div class="empty">
                No Groups
            </div>
        {:else}
            {#each filteredGroups as group (group.id)}
                <div
                    class="item"
                    class:selected={selectedGroup?.id === group.id}
                    on:click={() => handleSelectGroup(group)}
                >
                    <div class="avatar group">
                        👥
                    </div>

                    <div class="details">
                        <div class="name">
                            {group.name}
                        </div>

                        <div class="sub">
                            Group Chat
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    <div class="section">
        <div class="section-title">
            Contacts
        </div>

        {#if filteredContacts.length === 0}
            <div class="empty">
                No Contacts
            </div>
        {:else}
            {#each filteredContacts as contact (contact.id)}
                <div
                    class="item"
                    class:selected={selectedContact?.id === contact.id}
                    on:click={() => handleSelectContact(contact)}
                >
                    <div class="avatar">
                        {(contact.name || "?").charAt(0).toUpperCase()}
                    </div>

                    <div class="details">
                        <div class="name">
                            {contact.name}
                        </div>

                        <div class="sub">
                            {contact.mobile || ""}
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

</div>

<style>
.sidebar{
    display:flex;
    flex-direction:column;
    height:100%;
    background:#fff;
}

.header{
    padding:18px;
    border-bottom:1px solid #ddd;
}

.header h2{
    margin:0;
    color:#075e54;
}

.search{
    padding:10px;
}

.search input{
    width:100%;
    padding:10px;
    border-radius:8px;
    border:1px solid #ddd;
    box-sizing:border-box;
}

.buttons{
    display:flex;
    gap:8px;
    padding:10px;
}

.buttons button{
    flex:1;
    padding:10px;
    border:none;
    border-radius:8px;
    background:#128c7e;
    color:white;
    cursor:pointer;
}

.section{
    padding:10px;
}

.section-title{
    font-weight:bold;
    margin-bottom:8px;
    color:#666;
}

.item{
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px;
    border-radius:8px;
    cursor:pointer;
    transition:.2s;
}

.item:hover{
    background:#f5f5f5;
}

.selected{
    background:#dcf8c6;
}

.avatar{
    width:42px;
    height:42px;
    border-radius:50%;
    background:#128c7e;
    color:white;
    display:flex;
    justify-content:center;
    align-items:center;
    font-weight:bold;
}

.avatar.group{
    background:#075e54;
}

.details{
    flex:1;
}

.name{
    font-weight:600;
}

.sub{
    color:#777;
    font-size:12px;
}

.empty{
    padding:15px;
    color:#999;
    text-align:center;
}
</style>