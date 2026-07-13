<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { fade, fly } from "svelte/transition";

    export let templates: any[] = [];

    const dispatch = createEventDispatcher();

    let search = "";
    let searchInput: HTMLInputElement;

    onMount(() => {
        searchInput?.focus();
    });

    $: filtered = templates.filter((t) => {
        if (!search.trim()) return true;

        const searchLower = search.toLowerCase();
        const text = (
            (t.name ?? "") +
            " " +
            (t.department ?? "") +
            " " +
            (t.template_code ?? "") +
            " " +
            (t.version ?? "")
        ).toLowerCase();

        return text.includes(searchLower);
    });

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            dispatch('close');
        }
    }

    function selectTemplate(template: any) {
        dispatch("use", template); // Parent will open form popup
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="popup" transition:fly={{ y: -20, duration: 200 }}>
    <div class="header">
        <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
                bind:this={searchInput}
                placeholder="Search template by name, code, department..."
                bind:value={search}
            />
            {#if search}
                <button 
                    class="clear" 
                    on:click={() => search = ''}
                    aria-label="Clear search"
                >
                    ✕
                </button>
            {/if}
        </div>

        <button
            class="new"
            on:click={() => dispatch("new")}
        >
            + New Template
        </button>
    </div>

    <div class="list">
        {#if templates.length === 0}
            <div class="empty">
                <div class="empty-icon">📄</div>
                <h3>No Templates Yet</h3>
                <p>Create your first template to get started.</p>
                <button class="new" on:click={() => dispatch("new")}>
                    Create Template
                </button>
            </div>
        {:else if filtered.length === 0}
            <div class="empty">
                <div class="empty-icon">🔍</div>
                <h3>No Results</h3>
                <p>No templates match "{search}"</p>
                <button class="clear-search" on:click={() => search = ''}>
                    Clear Search
                </button>
            </div>
        {:else}
            {#each filtered as template (template.id)}
                <div 
                    class="card" 
                    on:click={() => selectTemplate(template)}
                    on:keydown={(e) => e.key === 'Enter' && selectTemplate(template)}
                    tabindex="0"
                    role="button"
                    transition:fade={{ duration: 150 }}
                >
                    <div class="left">
                        <div class="icon">
                            {template.icon || "📄"}
                        </div>

                        <div class="info">
                            <div class="title">
                                {template.name}
                            </div>
                            <div class="sub">
                                {#if template.template_code}
                                    <span class="code">{template.template_code}</span>
                                    <span class="dot">•</span>
                                {/if}
                                {#if template.department}
                                    <span>{template.department}</span>
                                {/if}
                                {#if template.version}
                                    <span class="dot">•</span>
                                    <span>v{template.version}</span>
                                {/if}
                                <span class="dot">•</span>
                                <span>Fields: {template.fields?.length || 0}</span>
                            </div>
                            {#if template.description}
                                <div class="desc">{template.description}</div>
                            {/if}
                        </div>
                    </div>

                    <button
                        class="use"
                        on:click|stopPropagation={() => selectTemplate(template)}
                    >
                        Use
                    </button>
                </div>
            {/each}
        {/if}
    </div>

    <div class="footer">
        <small>{filtered.length} of {templates.length} templates</small>
    </div>
</div>

<style>
.popup{
    width:700px;
    max-width:95vw;
    max-height:80vh;
    display:flex;
    flex-direction:column;
    background: white;
    border-radius: 16px;
    overflow: hidden;
}

.header{
    display:flex;
    gap:12px;
    padding: 20px 20px 16px 20px;
    border-bottom: 1px solid #e5e7eb;
}

.search-wrapper{
    flex:1;
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon{
    position: absolute;
    left: 12px;
    pointer-events: none;
    opacity: 0.5;
}

.search-wrapper input{
    flex:1;
    padding:12px 12px 12px 40px;
    border-radius:10px;
    border:1px solid #d1d5db;
    font-size: 14px;
}

.search-wrapper input:focus{
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.clear{
    position: absolute;
    right: 8px;
    width: 24px;
    height: 24px;
    border: none;
    background: #e5e7eb;
    border-radius: 50%;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.clear:hover{
    background: #d1d5db;
}

.new{
    padding:12px 18px;
    background:#2563eb;
    color:#fff;
    border:none;
    border-radius:10px;
    cursor:pointer;
    font-weight: 600;
    white-space: nowrap;
}

.new:hover{
    background:#1d4ed8;
}

.list{
    flex: 1;
    overflow:auto;
    padding: 16px 20px;
}

.card{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:14px;
    margin-bottom:10px;
    background:#fff;
    border:1px solid #e5e7eb;
    border-radius:12px;
    cursor: pointer;
    transition: all 0.15s;
}

.card:hover{
    border-color: #2563eb;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transform: translateY(-1px);
}

.card:focus{
    outline: 2px solid #2563eb;
    outline-offset: 2px;
}

.left{
    display:flex;
    gap:14px;
    align-items:flex-start;
    flex: 1;
    min-width: 0;
}

.icon{
    width:44px;
    height:44px;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#eef4ff;
    border-radius:10px;
    font-size:22px;
    flex-shrink: 0;
}

.info{
    flex: 1;
    min-width: 0;
}

.title{
    font-weight:600;
    font-size: 15px;
    margin-bottom: 4px;
}

.sub{
    color:#64748b;
    font-size:13px;
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}

.code{
    font-family: monospace;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

.dot{
    opacity: 0.5;
}

.desc{
    color: #94a3b8;
    font-size: 12px;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.use{
    padding:8px 18px;
    background:#22c55e;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight: 600;
    flex-shrink: 0;
}

.use:hover{
    background:#16a34a;
}

.empty{
    text-align:center;
    padding:60px 20px;
    color:#64748b;
}

.empty-icon{
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
}

.empty h3{
    margin: 0 0 8px 0;
    color: #334155;
}

.empty p{
    margin: 0 0 20px 0;
}

.clear-search{
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 8px;
    cursor: pointer;
}

.footer{
    padding: 12px 20px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    text-align: center;
}

.footer small{
    color: #64748b;
}
</style>