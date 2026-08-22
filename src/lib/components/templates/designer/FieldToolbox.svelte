<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    interface Tool {
        icon: string;
        name: string;
        type: string;
        description?: string;
        special?: boolean;
        options?: string[];
        metric?: string;
    }

    /*
     * -------------------------------------------------
     * FIELD TOOLBOX
     * -------------------------------------------------
     *
     * Normal fields:
     * Text, Number, Date, Time, Dropdown, etc.
     *
     * Special fields:
     * Station and Shift are application-level fields.
     * They come with predefined options.
     *
     * Metric fields are NOT added here.
     * Input / Output / Retest / NTF / OT / Fail
     * should be selected from Field Properties as metrics.
     */

    const tools: Tool[] = [
        {
            icon: "🏭",
            name: "Station",
            type: "station",
            description: "Production station selector",
            special: true,
            options: [
                "RAT",
                "AotA",
                "SotA",
                "AXI",
                "ICT",
                "FCT",
                "Packing",
                "SMT Line 1",
                "SMT Line 2",
                "Assembly",
                "Repair"
            ]
        },

        {
            icon: "🔄",
            name: "Shift",
            type: "shift",
            description: "Production shift selector",
            special: true,
            options: [
                "A",
                "B",
                "C",
                "Day (A+B+C)"
            ]
        },

        {
            icon: "📝",
            name: "Text",
            type: "text",
            description: "Single line text"
        },

        {
            icon: "🔢",
            name: "Number",
            type: "number",
            description: "Numeric value"
        },

        {
            icon: "📅",
            name: "Date",
            type: "date",
            description: "Report date"
        },

        {
            icon: "⏰",
            name: "Time",
            type: "time",
            description: "Report time"
        },

        {
            icon: "📋",
            name: "Dropdown",
            type: "dropdown",
            description: "Custom selection list"
        },

        {
            icon: "☑",
            name: "Checkbox",
            type: "checkbox",
            description: "Yes / No selection"
        },

        {
            icon: "🧾",
            name: "Textarea",
            type: "textarea",
            description: "Multi-line text"
        },

        {
            icon: "🧮",
            name: "Formula",
            type: "formula",
            description: "Calculated value"
        },

        {
            icon: "📷",
            name: "Image",
            type: "image",
            description: "Image upload"
        },

        {
            icon: "📎",
            name: "Attachment",
            type: "attachment",
            description: "File attachment"
        },

        {
            icon: "📍",
            name: "GPS",
            type: "gps",
            description: "GPS location"
        },

        {
            icon: "✍",
            name: "Signature",
            type: "signature",
            description: "Digital signature"
        },

        {
            icon: "⭐",
            name: "Rating",
            type: "rating",
            description: "Rating value"
        }
    ];

    let search = "";
    let draggingType = "";

    $: keyword = search.trim().toLowerCase();

    $: filtered = tools.filter((tool) => {
        if (!keyword) return true;

        return (
            tool.name.toLowerCase().includes(keyword) ||
            tool.type.toLowerCase().includes(keyword) ||
            tool.description?.toLowerCase().includes(keyword)
        );
    });

    /*
     * -------------------------------------------------
     * ADD TOOL
     * -------------------------------------------------
     */

    function addTool(tool: Tool) {
        dispatch("add", {
            type: tool.type,
            label: tool.name,
            name: tool.name,

            special: !!tool.special,

            /*
             * Predefined options for Station / Shift.
             * FieldToolbox sends these to TemplateDesigner.
             */
            options: tool.options
                ? [...tool.options]
                : [],

            /*
             * Metrics are intentionally NOT assigned here.
             *
             * Example:
             * Number field -> later choose Input/Output/etc.
             */
            metric: tool.metric ?? ""
        });
    }

    /*
     * -------------------------------------------------
     * DRAG START
     * -------------------------------------------------
     */

    function handleDragStart(
        event: DragEvent,
        tool: Tool
    ) {
        draggingType = tool.type;

        if (!event.dataTransfer) return;

        const payload = {
            type: tool.type,
            label: tool.name,
            name: tool.name,
            special: !!tool.special,
            options: tool.options
                ? [...tool.options]
                : [],
            metric: tool.metric ?? ""
        };

        event.dataTransfer.effectAllowed = "copy";

        event.dataTransfer.setData(
            "application/json",
            JSON.stringify(payload)
        );

        /*
         * Fallback for simple drop handlers.
         */
        event.dataTransfer.setData(
            "text/plain",
            tool.type
        );
    }

    /*
     * -------------------------------------------------
     * DRAG END
     * -------------------------------------------------
     */

    function handleDragEnd() {
        draggingType = "";
    }

    /*
     * -------------------------------------------------
     * KEYBOARD SUPPORT
     * -------------------------------------------------
     */

    function handleKeydown(
        event: KeyboardEvent,
        tool: Tool
    ) {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            addTool(tool);
        }
    }
</script>

<div class="toolbox">

    <div class="toolbox-header">

        <div>
            <h2>🧰 Field Toolbox</h2>

            <p>
                Click or drag a field into the designer
            </p>
        </div>

        <span class="field-count">
            {filtered.length}
        </span>

    </div>

    <div class="search-wrapper">

        <span class="search-icon">
            🔍
        </span>

        <input
            class="search"
            bind:value={search}
            placeholder="Search fields..."
            aria-label="Search fields"
        />

        {#if search}

            <button
                type="button"
                class="clear-search"
                aria-label="Clear search"
                on:click={() => search = ""}
            >
                ×
            </button>

        {/if}

    </div>

    <div class="drop-hint">

        <span>↔</span>

        <div>
            <strong>Drag & Drop</strong>
            <small>
                Drag a field into the Fields area
            </small>
        </div>

    </div>

    <div class="section-title">
        <span>Recommended fields</span>
    </div>

    <div class="tool-list">

        {#each filtered as tool (tool.type)}

            <button
                type="button"
                class:special={tool.special}
                class:dragging={draggingType === tool.type}
                class="tool"
                draggable="true"
                title={`Add ${tool.name}`}
                aria-label={`Add ${tool.name} field`}
                on:click={() => addTool(tool)}
                on:keydown={(event) =>
                    handleKeydown(event, tool)
                }
                on:dragstart={(event) =>
                    handleDragStart(event, tool)
                }
                on:dragend={handleDragEnd}
            >

                <div class="icon">
                    {tool.icon}
                </div>

                <div class="content">

                    <div class="tool-name">

                        <b>{tool.name}</b>

                        {#if tool.special}

                            <span class="recommended">
                                Ready
                            </span>

                        {/if}

                    </div>

                    <small>
                        {tool.description ?? tool.type}
                    </small>

                    {#if tool.options?.length}

                        <div class="option-preview">

                            {tool.options.slice(0, 3).join(" • ")}

                            {#if tool.options.length > 3}
                                +{tool.options.length - 3} more
                            {/if}

                        </div>

                    {/if}

                </div>

                <span class="drag-icon">
                    ⋮⋮
                </span>

            </button>

        {/each}

        {#if filtered.length === 0}

            <div class="empty">

                <div class="empty-icon">
                    🔎
                </div>

                <strong>
                    No matching field
                </strong>

                <small>
                    Try another search term
                </small>

            </div>

        {/if}

    </div>

</div>

<style>

.toolbox {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 18px;
    border-radius: 16px;

    display: flex;
    flex-direction: column;
    gap: 14px;

    box-shadow:
        0 4px 12px rgba(15, 23, 42, 0.04),
        0 1px 3px rgba(15, 23, 42, 0.05);
}

/* -------------------------------------------------
   HEADER
-------------------------------------------------- */

.toolbox-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.toolbox-header h2 {
    margin: 0;

    color: #0f172a;

    font-size: 17px;
    font-weight: 700;
}

.toolbox-header p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
}

.field-count {
    min-width: 28px;
    height: 28px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #eff6ff;
    color: #2563eb;

    border-radius: 8px;

    font-size: 12px;
    font-weight: 700;
}

/* -------------------------------------------------
   SEARCH
-------------------------------------------------- */

.search-wrapper {
    position: relative;

    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 11px;

    font-size: 13px;

    pointer-events: none;
}

.search {
    width: 100%;

    box-sizing: border-box;

    padding: 10px 34px;

    border: 1px solid #dbe3ef;
    border-radius: 10px;

    background: #f8fafc;

    color: #0f172a;

    font-size: 13px;

    outline: none;

    transition:
        border-color .2s,
        background .2s,
        box-shadow .2s;
}

.search::placeholder {
    color: #94a3b8;
}

.search:focus {
    background: white;

    border-color: #2563eb;

    box-shadow:
        0 0 0 3px rgba(37, 99, 235, .10);
}

.clear-search {
    position: absolute;
    right: 8px;

    width: 24px;
    height: 24px;

    border: none;
    border-radius: 6px;

    background: transparent;

    color: #64748b;

    font-size: 18px;

    cursor: pointer;
}

.clear-search:hover {
    background: #e2e8f0;
}

/* -------------------------------------------------
   DRAG HINT
-------------------------------------------------- */

.drop-hint {
    display: flex;
    align-items: center;
    gap: 10px;

    padding: 10px 12px;

    background: #f8fafc;

    border: 1px dashed #cbd5e1;

    border-radius: 10px;

    color: #475569;
}

.drop-hint > span {
    width: 30px;
    height: 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #eff6ff;

    color: #2563eb;

    border-radius: 8px;

    font-size: 16px;
}

.drop-hint strong {
    display: block;

    font-size: 12px;
    font-weight: 700;
}

.drop-hint small {
    display: block;

    margin-top: 2px;

    color: #94a3b8;

    font-size: 10px;
}

/* -------------------------------------------------
   SECTION
-------------------------------------------------- */

.section-title {
    color: #64748b;

    font-size: 10px;
    font-weight: 700;

    text-transform: uppercase;
    letter-spacing: .08em;
}

/* -------------------------------------------------
   TOOL LIST
-------------------------------------------------- */

.tool-list {
    display: flex;
    flex-direction: column;
    gap: 7px;

    max-height: 550px;

    overflow-y: auto;

    padding-right: 3px;
}

/* -------------------------------------------------
   TOOL
-------------------------------------------------- */

.tool {
    position: relative;

    display: flex;
    align-items: center;

    width: 100%;

    gap: 11px;

    padding: 10px;

    border: 1px solid transparent;
    border-radius: 11px;

    background: white;

    color: #0f172a;

    cursor: grab;

    transition:
        background .18s,
        border-color .18s,
        transform .18s,
        box-shadow .18s;

    text-align: left;
}

.tool:active {
    cursor: grabbing;
}

.tool:hover {
    background: #f8fafc;

    border-color: #dbeafe;

    transform: translateX(2px);
}

.tool:focus-visible {
    outline: none;

    border-color: #2563eb;

    box-shadow:
        0 0 0 3px rgba(37, 99, 235, .12);
}

.tool.special {
    background: #f8fbff;

    border-color: #dbeafe;
}

.tool.special:hover {
    background: #eff6ff;

    border-color: #93c5fd;
}

.tool.dragging {
    opacity: .5;

    transform: scale(.98);
}

/* -------------------------------------------------
   ICON
-------------------------------------------------- */

.icon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #f1f5f9;

    border-radius: 9px;

    font-size: 21px;
}

.tool.special .icon {
    background: #dbeafe;
}

/* -------------------------------------------------
   CONTENT
-------------------------------------------------- */

.content {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;
}

.tool-name {
    display: flex;
    align-items: center;

    gap: 7px;

    min-width: 0;
}

.content b {
    color: #1e293b;

    font-size: 13px;
    font-weight: 650;
}

.content small {
    margin-top: 2px;

    color: #94a3b8;

    font-size: 10px;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recommended {
    padding: 2px 6px;

    border-radius: 5px;

    background: #dcfce7;

    color: #15803d;

    font-size: 9px;
    font-weight: 700;
}

/* -------------------------------------------------
   OPTION PREVIEW
-------------------------------------------------- */

.option-preview {
    margin-top: 4px;

    color: #64748b;

    font-size: 9px;

    white-space: nowrap;

    overflow: hidden;

    text-overflow: ellipsis;
}

/* -------------------------------------------------
   DRAG ICON
-------------------------------------------------- */

.drag-icon {
    flex-shrink: 0;

    color: #cbd5e1;

    font-size: 15px;
    letter-spacing: -3px;

    cursor: grab;
}

.tool:hover .drag-icon {
    color: #64748b;
}

/* -------------------------------------------------
   EMPTY
-------------------------------------------------- */

.empty {
    padding: 35px 15px;

    display: flex;
    flex-direction: column;
    align-items: center;

    text-align: center;

    color: #64748b;
}

.empty-icon {
    margin-bottom: 8px;

    font-size: 24px;
}

.empty strong {
    font-size: 13px;
}

.empty small {
    margin-top: 4px;

    color: #94a3b8;

    font-size: 10px;
}

/* -------------------------------------------------
   SCROLLBAR
-------------------------------------------------- */

.tool-list::-webkit-scrollbar {
    width: 6px;
}

.tool-list::-webkit-scrollbar-track {
    background: transparent;
}

.tool-list::-webkit-scrollbar-thumb {
    background: #cbd5e1;

    border-radius: 10px;
}

.tool-list::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* -------------------------------------------------
   MOBILE
-------------------------------------------------- */

@media (max-width: 900px) {

    .toolbox {
        padding: 14px;
    }

    .tool-list {
        max-height: 350px;
    }

}

</style>