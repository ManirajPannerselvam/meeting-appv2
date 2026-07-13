<script lang="ts">
import { createEventDispatcher, onMount } from "svelte";
import { supabase } from "$lib/supabase";

export let open = false;

const dispatch = createEventDispatcher();

let groupName = "";
let description = "";

let contacts: any[] = [];
let selected: string[] = [];

let loading = false;
let saving = false;

onMount(loadContacts);

async function loadContacts() {

    loading = true;

    try {

        const currentUser = localStorage.getItem("userId");

        const { data, error } = await supabase
            .from("users")
            .select("id,name,mobile")
            .neq("id", currentUser)
            .order("name");

        if (error) throw error;

        contacts = data || [];

    } catch (err) {

        console.error(err);

    } finally {

        loading = false;

    }

}

function toggleMember(id: string) {

    if (selected.includes(id)) {

        selected = selected.filter(x => x !== id);

    } else {

        selected = [...selected, id];

    }

}

async function saveGroup() {

    if (!groupName.trim()) {

        alert("Enter Group Name");

        return;

    }

    saving = true;

    try {

        const owner = localStorage.getItem("userId");

        const { data, error } = await supabase
            .from("chat_groups")
            .insert({
                name: groupName,
                description,
                owner_id: owner
            })
            .select()
            .single();

        if (error) throw error;

        const members = [

            owner,

            ...selected

        ];

        const rows = members.map(user => ({

            group_id: data.id,

            user_id: user

        }));

        const { error: memberError } = await supabase

            .from("chat_group_members")

            .insert(rows);

        if (memberError) throw memberError;

        dispatch("saved", data);

        dispatch("close");

        groupName = "";
        description = "";
        selected = [];

    } catch (err) {

        console.error(err);

        alert("Unable to create group.");

    } finally {

        saving = false;

    }

}

function close() {

    dispatch("close");

}
</script>
{#if open}

<div class="overlay" on:click={close}>

    <div class="popup" on:click|stopPropagation>

        <div class="header">

            <h2>Create Group</h2>

            <button
                class="close"
                on:click={close}
            >
                ✕
            </button>

        </div>

        <div class="body">

            <input
                type="text"
                bind:value={groupName}
                placeholder="Group Name"
            />

            <textarea
                bind:value={description}
                rows="3"
                placeholder="Description (Optional)"
            ></textarea>

            <h3>Select Members</h3>

            {#if loading}

                <div class="loading">

                    Loading contacts...

                </div>

            {:else}

                <div class="members">

                    {#each contacts as contact (contact.id)}

                        <label class="member">

                            <input
                                type="checkbox"
                                checked={selected.includes(contact.id)}
                                on:change={() => toggleMember(contact.id)}
                            />

                            <div class="avatar">

                                {contact.name?.charAt(0).toUpperCase()}

                            </div>

                            <div class="info">

                                <div class="name">

                                    {contact.name}

                                </div>

                                <div class="mobile">

                                    {contact.mobile}

                                </div>

                            </div>

                        </label>

                    {/each}

                </div>

            {/if}

        </div>

        <div class="footer">

            <button
                class="cancel"
                on:click={close}
            >
                Cancel
            </button>

            <button
                class="save"
                disabled={saving}
                on:click={saveGroup}
            >
                {#if saving}
                    Creating...
                {:else}
                    Create Group
                {/if}
            </button>

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
    width:500px;
    max-width:95%;
    max-height:90vh;
    background:white;
    border-radius:14px;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    box-shadow:0 12px 40px rgba(0,0,0,.25);
}

.header{
    background:#00a884;
    color:white;
    height:60px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 20px;
}

.header h2{
    margin:0;
    font-size:20px;
}

.close{
    width:36px;
    height:36px;
    border:none;
    border-radius:50%;
    background:transparent;
    color:white;
    cursor:pointer;
    font-size:20px;
}

.close:hover{
    background:rgba(255,255,255,.2);
}

.body{
    padding:20px;
    overflow:auto;
    flex:1;
}

.body input,
.body textarea{
    width:100%;
    box-sizing:border-box;
    padding:12px;
    margin-bottom:15px;
    border:1px solid #ddd;
    border-radius:8px;
    font-size:14px;
    outline:none;
}

.body input:focus,
.body textarea:focus{
    border-color:#00a884;
}

.body h3{
    margin:10px 0;
    color:#444;
}

.members{
    display:flex;
    flex-direction:column;
    gap:10px;
}

.member{
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px;
    border-radius:8px;
    cursor:pointer;
    transition:.2s;
}

.member:hover{
    background:#f5f5f5;
}

.avatar{
    width:42px;
    height:42px;
    border-radius:50%;
    background:#00a884;
    color:white;
    display:flex;
    justify-content:center;
    align-items:center;
    font-weight:bold;
    font-size:16px;
    flex-shrink:0;
}

.info{
    flex:1;
}

.name{
    font-weight:600;
}

.mobile{
    font-size:12px;
    color:#666;
}

.footer{
    display:flex;
    justify-content:flex-end;
    gap:10px;
    padding:15px;
    border-top:1px solid #eee;
}

.cancel{
    padding:10px 20px;
    border:none;
    border-radius:8px;
    cursor:pointer;
    background:#ddd;
}

.save{
    padding:10px 20px;
    border:none;
    border-radius:8px;
    cursor:pointer;
    background:#00a884;
    color:white;
}

.save:disabled{
    opacity:.6;
    cursor:not-allowed;
}

.loading{
    text-align:center;
    padding:30px;
    color:#666;
}

@media(max-width:768px){

.popup{
    width:100%;
    height:100%;
    max-width:100%;
    max-height:100%;
    border-radius:0;
}

.body{
    padding:15px;
}

}

</style>