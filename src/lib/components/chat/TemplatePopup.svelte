<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let templates: any[] = [];
    export let loading = false;

    const dispatch = createEventDispatcher();

    let search = "";
    let deletingId: string | number | null = null;

    $: filteredTemplates = (templates ?? []).filter((template) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
            template?.name,
            template?.template_code,
            template?.category,
            template?.description
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    function close() { dispatch("close"); }

    function handleEdit(template: any) {
        if (!template) return;
        dispatch("edit", { template });
    }

    function handleNew() {
        // 1. Open your create page
        if(typeof window !== 'undefined'){
            window.open("http://localhost:1420/templates", "_blank");
        }
        // 2. Also dispatch for internal designer if you have it
        dispatch("new");
        dispatch("create");
    }

    function handleUse(template: any) {
        if (!template) return;
        dispatch("use", { template });
    }

    async function handleDelete(template: any) {
        if (!template?.id || deletingId !== null) return;
        const confirmed = window.confirm(`Delete "${template.name || "this template"}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;
        deletingId = template.id;
        try {
            const response = await fetch(`/api/templates?id=${encodeURIComponent(String(template.id))}`, { method: "DELETE", headers: { Accept: "application/json" } });
            const contentType = response.headers.get("content-type") || "";
            const raw = await response.text();
            if (!contentType.includes("application/json")) throw new Error(`Template API returned non-JSON (HTTP ${response.status}).`);
            let result: any;
            try { result = JSON.parse(raw); } catch { throw new Error("Template API returned invalid JSON."); }
            if (!response.ok || result?.success === false) throw new Error(result?.error || `Failed to delete template (HTTP ${response.status}).`);
            dispatch("deleted", { template });
        } catch (error) {
            console.error("[TemplatePopup] Delete failed:", error);
            dispatch("error", { error: error instanceof Error ? error.message : "Failed to delete template." });
            window.alert(error instanceof Error ? error.message : "Failed to delete template.");
        } finally {
            deletingId = null;
        }
    }

    function getFields(template: any): any[] { return Array.isArray(template?.data?.fields) ? template.data.fields : []; }
    function getDepartment(template: any): string { return template?.data?.department || template?.department || template?.category || "General"; }
    function getDescription(template: any): string { return template?.description || template?.data?.description || "No description"; }
    function handleKeydown(event: KeyboardEvent, action: () => void) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); } }
</script>

<div class="overlay" role="presentation" on:click={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section class="popup" role="dialog" aria-modal="true" aria-labelledby="template-title">
        <header class="popup-header">
            <div class="title-wrap">
                <span class="title-icon" aria-hidden="true">📋</span>
                <div>
                    <h2 id="template-title">Templates</h2>
                    <p>{filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}</p>
                </div>
            </div>
            <button type="button" class="close-btn" title="Close" aria-label="Close templates" on:click={close}>×</button>
        </header>

        <div class="toolbar">
            <div class="search-box">
                <span aria-hidden="true">🔍</span>
                <input bind:value={search} type="search" placeholder="Search template by name, code, category..." aria-label="Search templates" />
                {#if search}<button type="button" class="clear-search" aria-label="Clear template search" on:click={() => (search = "")}>×</button>{/if}
            </div>
            <button type="button" class="new-btn" title="Create new template" on:click={handleNew}><span>+</span> New</button>
        </div>

        <div class="template-list">
            {#if loading}
                <div class="state"><div class="spinner"></div><p>Loading templates...</p></div>
            {:else if filteredTemplates.length === 0}
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    {#if search}
                        <h3>No templates found</h3><p>Try a different search term.</p><button type="button" class="secondary-btn" on:click={() => (search = "")}>Clear Search</button>
                    {:else}
                        <h3>No templates yet</h3><p>Create your first reporting template.</p><button type="button" class="new-empty-btn" on:click={handleNew}>+ Create Template</button>
                    {/if}
                </div>
            {:else}
                {#each filteredTemplates as template (template.id ?? template.template_code)}
                    <article class="template-card">
                        <div class="template-icon" role="button" tabindex="0" aria-label={`Use ${template.name || "template"}`} on:click={() => handleUse(template)} on:keydown={(event) => handleKeydown(event, () => handleUse(template))}>📄</div>
                        <div class="template-info">
                            <div class="name-row"><h3>{template.name || "Untitled Template"}</h3>{#if template.template_code}<span class="code">{template.template_code}</span>{/if}</div>
                            <div class="meta">Fields: {getFields(template).length}<span>•</span>{getDepartment(template)}</div>
                            <p class="description">{getDescription(template)}</p>
                        </div>
                        <div class="actions">
                            <button type="button" class="action edit" on:click={() => handleEdit(template)}>Edit</button>
                            <button type="button" class="action delete" disabled={deletingId === template.id} on:click={() => handleDelete(template)}>{deletingId === template.id ? "..." : "Delete"}</button>
                            <button type="button" class="action use" on:click={() => handleUse(template)}>Use</button>
                        </div>
                    </article>
                {/each}
            {/if}
        </div>

        <footer class="popup-footer">
            {#if search && filteredTemplates.length !== templates.length}Showing {filteredTemplates.length} of {templates.length} templates{:else}{templates.length} {templates.length === 1 ? "template" : "templates"}{/if}
            <span> • <a href="http://localhost:1420/templates" target="_blank">Create in Designer →</a></span>
        </footer>
    </section>
</div>

<style>
    .overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); }
    .popup { width: min(880px, 100%); max-height: min(720px, calc(100dvh - 40px)); display: flex; flex-direction: column; overflow: hidden; background: #fff; border-radius: 20px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28); }
    .popup-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
    .title-wrap { display: flex; align-items: center; gap: 12px; }
    .title-icon { font-size: 24px; }
    h2 { margin: 0; color: #1f2937; font-size: 22px; line-height: 1.2; }
    .title-wrap p { margin: 3px 0 0; color: #94a3b8; font-size: 12px; }
    .close-btn { width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: #64748b; font-size: 30px; line-height: 1; cursor: pointer; }
    .close-btn:hover { background: #f1f5f9; }
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 22px; border-bottom: 1px solid #eef2f7; }
    .search-box { flex: 1; min-width: 0; height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 1px solid #d9dee7; border-radius: 12px; background: #fff; }
    .search-box > span { font-size: 18px; }
    .search-box input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; color: #1f2937; background: transparent; font-size: 15px; }
    .search-box input::placeholder { color: #94a3b8; }
    .clear-search { width: 28px; height: 28px; border: 0; border-radius: 50%; background: #f1f5f9; color: #64748b; cursor: pointer; font-size: 18px; }
    .new-btn { height: 48px; min-width: 108px; padding: 0 18px; border: 0; border-radius: 11px; background: #16a34a; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 5px 15px rgba(22, 163, 74, 0.22); transition: transform 0.15s, background 0.15s; }
    .new-btn:hover { background: #15803d; transform: translateY(-1px); }
    .new-btn span { margin-right: 5px; font-size: 20px; }
    .template-list { flex: 1; min-height: 180px; overflow-y: auto; padding: 8px 20px 14px; }
    .template-card { display: flex; align-items: center; gap: 14px; min-height: 104px; margin: 8px 0; padding: 14px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s; }
    .template-card:hover { border-color: #d4dce8; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.07); transform: translateY(-1px); }
    .template-icon { width: 62px; height: 62px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 11px; background: #eff6ff; font-size: 30px; cursor: pointer; }
    .template-info { flex: 1; min-width: 0; }
    .name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .name-row h3 { margin: 0; color: #334155; font-size: 17px; }
    .code { padding: 4px 7px; border-radius: 5px; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; }
    .meta { margin-top: 6px; color: #64748b; font-size: 13px; }
    .meta span { margin: 0 4px; color: #cbd5e1; }
    .description { margin: 5px 0 0; overflow: hidden; color: #94a3b8; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
    .actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .action { height: 42px; padding: 0 15px; border: 0; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform 0.15s, opacity 0.15s; }
    .action:hover { transform: translateY(-1px); }
    .action:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .edit { background: #f1f5f9; color: #475569; }
    .delete { background: #ef4444; color: #fff; }
    .use { background: #16a34a; color: #fff; }
    .state, .empty-state { min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #64748b; }
    .state p, .empty-state p { margin: 8px 0 0; }
    .spinner { width: 30px; height: 30px; border: 3px solid #dbeafe; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .empty-icon { font-size: 40px; opacity: 0.7; }
    .empty-state h3 { margin: 10px 0 0; color: #334155; }
    .secondary-btn, .new-empty-btn { margin-top: 16px; height: 40px; padding: 0 16px; border: 0; border-radius: 9px; cursor: pointer; font-weight: 700; }
    .secondary-btn { background: #f1f5f9; color: #475569; }
    .new-empty-btn { background: #16a34a; color: #fff; }
    .popup-footer { padding: 14px 20px 18px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px; text-align: center; }
    .popup-footer a{ color:#2563eb; text-decoration:none; font-weight:600; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 700px) {
        .overlay { align-items: flex-end; padding: 0; }
        .popup { width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; }
        .popup-header { padding: 16px; }
        .toolbar { padding: 12px; }
        .new-btn { min-width: 88px; padding: 0 12px; }
        .template-list { padding: 5px 10px 12px; }
        .template-card { align-items: flex-start; flex-wrap: wrap; padding: 12px; }
        .template-icon { width: 50px; height: 50px; font-size: 24px; }
        .template-info { width: calc(100% - 64px); }
        .actions { width: 100%; padding-left: 64px; }
        .action { flex: 1; height: 40px; padding: 0 8px; }
        .description { white-space: normal; }
    }
</style>