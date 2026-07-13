<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { supabase } from "$lib/supabase";
    import { onMount } from "svelte";

    export let open = false;

    const dispatch = createEventDispatcher();

    let contacts: any[] = [];
    let filtered: any[] = [];
    let search = "";
    let loading = false;

    onMount(loadContacts);

    async function loadContacts() {

        loading = true;

        try {

            const currentUser = localStorage.getItem("userId");

            const { data, error } = await supabase
                .from("users")
                .select("id,name,mobile,email,department")
                .neq("id", currentUser)
                .order("name");

            if (error) throw error;

            contacts = data || [];
            filtered = contacts;

        } catch (err) {

            console.error(err);

        } finally {

            loading = false;

        }

    }

    function filterContacts() {

        const q = search.toLowerCase();

        filtered = contacts.filter(c =>

            c.name?.toLowerCase().includes(q) ||

            c.mobile?.includes(q) ||

            c.department?.toLowerCase().includes(q)

        );

    }

    function select(contact: any) {

        dispatch("select", contact);

        dispatch("close");

    }

    function close() {

        dispatch("close");

    }
</script>
{#if open}

<div class="overlay" on:click={close}>

    <div class="popup" on:click|stopPropagation>

        <div class="header">

            <h2>New Chat</h2>

            <button class="close" on:click={close}>
                ✕
            </button>

        </div>

        <div class="search">

            <input
                type="text"
                bind:value={search}
                on:input={filterContacts}
                placeholder="Search name, mobile or department..."
            />

        </div>

        <div class="contact-list">

            {#if loading}

                <div class="loading">

                    Loading contacts...

                </div>

            {:else if filtered.length === 0}

                <div class="empty">

                    No contacts found

                </div>

            {:else}

                {#each filtered as contact (contact.id)}

                    <button
                        class="contact"
                        on:click={() => select(contact)}
                    >

                        <div class="avatar">

                            {contact.name?.charAt(0).toUpperCase() ?? "?"}

                        </div>

                        <div class="info">

                            <div class="name">

                                {contact.name}

                            </div>

                            <div class="mobile">

                                {contact.mobile}

                            </div>

                            <div class="department">

                                {contact.department ?? ""}

                            </div>

                        </div>

                    </button>

                {/each}

            {/if}

        </div>

    </div>

</div>

{/if}
<style>

.overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.45);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:1000;
}

.popup{
    width:420px;
    max-width:95%;
    max-height:85vh;
    background:#ffffff;
    border-radius:14px;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    box-shadow:0 12px 40px rgba(0,0,0,.25);
    animation:popup .2s ease;
}

@keyframes popup{

    from{
        transform:scale(.96);
        opacity:0;
    }

    to{
        transform:scale(1);
        opacity:1;
    }

}

.header{
    height:60px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:0 18px;
    background:#00a884;
    color:white;
}

.header h2{
    margin:0;
    font-size:20px;
    font-weight:600;
}

.close{
    width:36px;
    height:36px;
    border:none;
    border-radius:50%;
    background:transparent;
    color:white;
    font-size:20px;
    cursor:pointer;
}

.close:hover{
    background:rgba(255,255,255,.18);
}

.search{
    padding:14px;
    border-bottom:1px solid #ececec;
}

.search input{
    width:100%;
    height:42px;
    border:1px solid #d6d6d6;
    border-radius:22px;
    padding:0 16px;
    font-size:14px;
    outline:none;
    box-sizing:border-box;
}

.search input:focus{
    border-color:#00a884;
}

.contact-list{
    flex:1;
    overflow-y:auto;
}

.contact{
    width:100%;
    border:none;
    background:white;
    display:flex;
    align-items:center;
    gap:14px;
    padding:14px 18px;
    cursor:pointer;
    transition:.2s;
    text-align:left;
}

.contact:hover{
    background:#f5f6f6;
}

.avatar{
    width:48px;
    height:48px;
    border-radius:50%;
    background:#00a884;
    color:white;
    display:flex;
    justify-content:center;
    align-items:center;
    font-size:18px;
    font-weight:bold;
    flex-shrink:0;
}

.info{
    flex:1;
    overflow:hidden;
}

.name{
    font-size:15px;
    font-weight:600;
    color:#111b21;
}

.mobile{
    font-size:13px;
    color:#667781;
    margin-top:2px;
}

.department{
    font-size:12px;
    color:#8696a0;
    margin-top:2px;
}

.loading,
.empty{
    padding:40px;
    text-align:center;
    color:#667781;
}

@media(max-width:600px){

.popup{
    width:100%;
    height:100%;
    max-width:100%;
    max-height:100%;
    border-radius:0;
}

.header{
    height:56px;
}

}

</style>