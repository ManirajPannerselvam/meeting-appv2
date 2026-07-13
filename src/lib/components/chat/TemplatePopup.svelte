<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    // FIX: Set default to [] and type it
    export let templates: any[] = [];
    export let show = false;
    export let selectedUser: any = null;

    const dispatch = createEventDispatcher();

    let searchTerm = '';
    let selectedTemplate: any = null;
    let formData: Record<string, string> = {};

    // FIX: Add null check + ensure array
    $: filteredTemplates = Array.isArray(templates)
       ? templates.filter(t =>
            t.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    function selectTemplate(template: any) {
        selectedTemplate = template;
        formData = {};
        // Initialize form fields
        if (template.fields) {
            template.fields.forEach((field: string) => {
                formData[field] = '';
            });
        }
    }

    function sendTemplate() {
        if (!selectedTemplate) return;

        dispatch('send', {
            template: {
                id: selectedTemplate.id,
                name: selectedTemplate.name,
                values: formData
            }
        });

        closePopup();
    }

    function closePopup() {
        show = false;
        selectedTemplate = null;
        formData = {};
        searchTerm = '';
        dispatch('close');
    }
</script>

{#if show}
    <div class="popup-overlay" on:click={closePopup}>
        <div class="popup-content" on:click|stopPropagation>
            <div class="popup-header">
                <h3>Select Template</h3>
                <button class="close-btn" on:click={closePopup}>×</button>
            </div>

            {#if!selectedTemplate}
                <!-- Template List -->
                <input
                    type="text"
                    placeholder="Search templates..."
                    bind:value={searchTerm}
                    class="search-input"
                />

                <div class="template-list">
                    {#if filteredTemplates.length === 0}
                        <div class="empty">No templates found</div>
                    {:else}
                        {#each filteredTemplates as template}
                            <div class="template-item" on:click={() => selectTemplate(template)}>
                                <div class="template-name">{template.name}</div>
                                <div class="template-desc">{template.description || 'No description'}</div>
                            </div>
                        {/each}
                    {/if}
                </div>
            {:else}
                <!-- Fill Template Form -->
                <div class="template-form">
                    <h4>{selectedTemplate.name}</h4>
                    {#each selectedTemplate.fields || [] as field}
                        <div class="form-field">
                            <label>{field}</label>
                            <input
                                type="text"
                                bind:value={formData[field]}
                                placeholder="Enter {field}"
                            />
                        </div>
                    {/each}

                    <div class="form-actions">
                        <button class="btn-back" on:click={() => selectedTemplate = null}>
                            Back
                        </button>
                        <button class="btn-send" on:click={sendTemplate}>
                            Send
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
.popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.popup-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e9edef;
}

.popup-header h3 {
    margin: 0;
    font-size: 18px;
}

.close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: #f0f2f5;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
}

.search-input {
    margin: 16px;
    padding: 10px 16px;
    border: 1px solid #e9edef;
    border-radius: 24px;
    font-size: 14px;
}

.template-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px;
}

.empty {
    text-align: center;
    padding: 40px;
    color: #667781;
}

.template-item {
    padding: 12px;
    border: 1px solid #e9edef;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
}

.template-item:hover {
    background: #f0f2f5;
}

.template-name {
    font-weight: 600;
    font-size: 15px;
}

.template-desc {
    font-size: 13px;
    color: #667781;
    margin-top: 4px;
}

.template-form {
    padding: 16px;
}

.template-form h4 {
    margin: 0 0 16px 0;
}

.form-field {
    margin-bottom: 16px;
}

.form-field label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    text-transform: capitalize;
}

.form-field input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e9edef;
    border-radius: 8px;
    font-size: 14px;
}

.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

.btn-back,.btn-send {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
}

.btn-back {
    background: #f0f2f5;
    color: #111b21;
}

.btn-send {
    background: #00a884;
    color: white;
}
</style>