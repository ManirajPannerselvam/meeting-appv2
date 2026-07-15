<script lang="ts">
    import { onMount } from "svelte";
    import { supabaseTemplates } from "$lib/supabase";
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
            const { data, error } = await supabaseTemplates
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            templates = data || [];
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
                    <small>{t.department || 'General'}</small>
                    <div class="chart">
                        {t.chart_x || t.chart || 'No chart'}
                    </div>
                    <div class="fields-count">
                        {t.fields?.length || 0} fields
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
    font-size: 15px;
    box-sizing: border-box;
}

.toolbar input:focus {
    outline: none;
    border-color: #3b82f6;
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
    font-size: 14px;
    font-weight: 500;
    color: #475569;
    transition: all 0.2s;
}

.departments button:hover {
    background: #e5e7eb;
}

.departments button.selected {
    background: #2563eb;
    color: white;
}

.template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    width: 100%;
}

.template-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,.08);
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
    border: 2px solid transparent;
    transition: all 0.2s;
}

.template-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
}

.template-card .icon {
    font-size: 28px;
}

.template-card .info h3 {
    margin: 0 0 4px 0;
    font-size: 18px;
    color: #1e293b;
}

.template-card .info small {
    color: #64748b;
    font-size: 13px;
}

.template-card .chart {
    margin-top: 8px;
    font-size: 13px;
    color: #3b82f6;
}

.fields-count {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
}

.template-card .use {
    margin-top: auto;
    padding: 10px;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
}

.template-card .use:hover {
    background: #15803d;
}

.empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    color: #94a3b8;
    font-size: 15px;
}
</style>