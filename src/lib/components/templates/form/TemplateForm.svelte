<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import FormRenderer from "./FormRenderer.svelte";

    export let template: any = null;

    const dispatch = createEventDispatcher();

    let values: Record<string, any> = {};
    let lastLoadedSignature = "";

    /* -------------------------
       Normalize template fields
    -------------------------- */

    function normalizeField(field: any) {
        const key =
            field.field_name ||
            field.name ||
            (field.label || "")
                .trim()
                .replace(/\s+/g, "_")
                .replace(/[^A-Za-z0-9_]/g, "");

        return {
            ...field,
            field_name: key,
            field_type: field.field_type || field.type || "text",
            label: field.label || key.replace(/_/g, " "),
            default_value: field.default_value ?? ""
        };
    }

    $: rawFields = template?.fields || template?.data?.fields || [];

    $: fields = rawFields.map(normalizeField);

    /* -------------------------
       Load last saved values
    -------------------------- */

    function getTemplateData() {
        if (!template) return {};

        if (typeof template.data === "string") {
            try {
                return JSON.parse(template.data);
            } catch {
                return {};
            }
        }

        return structuredClone(template.data || {});
    }

    $: if (template && fields.length) {

        const templateData = getTemplateData();

        const lastValues = templateData.last_values || {};

        const signature =
            template.id +
            JSON.stringify(lastValues);

        if (signature !== lastLoadedSignature) {

            lastLoadedSignature = signature;

            const init: Record<string, any> = {};

            fields.forEach((field: any) => {

                const key = field.field_name;

                init[key] =
                    lastValues[key] ??
                    field.default_value ??
                    "";

            });

            values = structuredClone(init);

            console.log("FORM LOADED");
            console.log(values);

        }

    }

    /* -------------------------
       Send
    -------------------------- */

    const dispatchEvent = createEventDispatcher();

    function send() {

        const payload = structuredClone(values);

        console.log("SEND TEMPLATE");
        console.log(payload);

        dispatchEvent("submit", {
            template,
            values: payload
        });

    }

    function cancel() {
        dispatchEvent("close");
    }
</script>


<div class="template-form">

    <div class="header">
        <div>
            <h2>{template?.name}</h2>
            <small>{template?.data?.department}</small>
        </div>

        <button class="close-btn" on:click={cancel}>
            ✕
        </button>
    </div>

    <div class="body">

        {#if fields.length}
            <FormRenderer
    {template}
    {fields}
    bind:values={values}
/>
        {:else}
            <p>Loading fields...</p>
        {/if}

    </div>

    <div class="footer">
        <button class="cancel" on:click={cancel}>
            Cancel
        </button>

        <button class="send" on:click={send}>
            Send Report
        </button>
    </div>

</div>

<style>
.template-form {
    width: 700px;
    max-width: 95vw;
    background: white;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

.header {
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h2 {
    margin: 0;
    font-size: 18px;
}

.header small {
    color: #64748b;
    font-size: 12px;
}

.body {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
}

.cancel {
    padding: 10px 18px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 8px;
    cursor: pointer;
}

.send {
    padding: 10px 18px;
    border: none;
    background: #16a34a;
    color: white;
    border-radius: 8px;
    cursor: pointer;
}

.close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
}
</style>