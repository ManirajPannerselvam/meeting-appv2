<script lang="ts">
    import { onMount } from "svelte";
    import { getTemplates } from "$lib/db/database";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let search = "";

    let department = "All";

    const departments = [
        "All",
        "Manufacturing",
        "Engineering",
        "Quality",
        "Maintenance",
        "Material",
        "Planning"
    ];

    let templates: any[] = [];

    async function loadTemplates() {
        try {
            templates = await getTemplates();
        } catch (e) {
            console.error("Failed to load templates", e);
            templates = [];
        }
    }

    onMount(() => {
        loadTemplates();

        const refresh = () => {
            loadTemplates();
        };

        window.addEventListener("templates:updated", refresh);

        return () => {
            window.removeEventListener("templates:updated", refresh);
        };
    });

    $: filtered = templates.filter((t: any) =>
        (department === "All" || t.department === department) &&
        (t.name || "").toLowerCase().includes(search.toLowerCase())
    );
</script>

<div class="toolbar">
    <input
        placeholder="🔍 Search Template..."
        bind:value={search}
    />
</div>

<div class="departments">
    {#each departments as d}
        <button
            class:selected={department === d}
            on:click={() => department = d}
        >
            {d}
        </button>
    {/each}
</div>

<div class="template-grid">
    {#if filtered.length === 0}
        <div class="empty">
            No Templates Found
        </div>
    {:else}
        {#each filtered as t}
            <div class="template-card">
                <div class="icon">
                    {t.icon ?? "📄"}
                </div>
                <div class="info">
                    <h3>{t.name}</h3>
                    <small>{t.department}</small>
                    <div class="chart">
                        {t.chart}
                    </div>
                </div>
                <button
                    class="use"
                    on:click={() => dispatch("select", t)}
                >
                    Use
                </button>
            </div>
        {/each}
    {/if}
</div>

<style>
.toolbar {
    margin-bottom: 16px;
}

.toolbar input {
    width: 100%;
    padding: 10px;
    border: 1px solid #d6dbe5;
    border-radius: 8px;
}

.departments {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
}

.departments button {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: #f3f4f6;
    cursor: pointer;
}

.departments button.selected {
    background: #2563eb;
    color: white;
}

.template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    width: 100%; /* fills parent column */
}

.template-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,.08);
    width: 100%; /* no fixed px width */
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.template-card .icon {
    font-size: 28px;
}

.template-card .info h3 {
    margin: 0;
    font-size: 18px;
    color: #1e293b;
}

.template-card .info small {
    color: #64748b;
}

.template-card .chart {
    margin-top: 8px;
}

.template-card .use {
    margin-top: auto;
    padding: 10px;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
}
</style>
