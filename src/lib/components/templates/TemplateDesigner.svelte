<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { supabase } from "$lib/supabase"; // add this import

  const dispatch = createEventDispatcher();

  let template = {
    template_code: "",
    name: "",
    department: "Production",
    category: "Production",
    version: 1,
    color: "#2563eb",
    icon: "📄",
    description: ""
  };

  let fields = [
    {
      field_name: "Input",
      field_label: "Input",
      field_type: "number",
      placeholder: "",
      required: true,
      readonly: false,
      hidden: false,
      default_value: "", // renamed to match DB
      formula: "",
      options_json: "",
      min_value: null,
      max_value: null
    }
  ];

  function addField() {
    const newField = {
      field_name: "",
      field_label: "",
      field_type: "text",
      placeholder: "",
      required: false,
      readonly: false,
      hidden: false,
      default_value: "",
      formula: "",
      options_json: "",
      min_value: null,
      max_value: null
    };
    fields = [...fields, newField];
  }

  async function saveTemplate() {
    if (!template.template_code.trim()) {
      alert("Template Code required");
      return;
    }
    if (!template.name.trim()) {
      alert("Template Name required");
      return;
    }

    try {
      // 1. Insert template
      const { data: newTemplate, error: tErr } = await supabase
       .from("templates")
       .insert({
          template_code: template.template_code,
          name: template.name,
          department: template.department,
          category: template.category,
          version: template.version,
          color: template.color,
          icon: template.icon,
          description: template.description
        })
       .select()
       .single();

      if (tErr) throw tErr;

      // 2. Insert fields
      const fieldsToInsert = fields
       .filter(f => f.field_label.trim() && f.field_name.trim())
       .map((f, i) => ({
          template_id: newTemplate.id,
          field_name: f.field_name.replace(/\s+/g, ""),
          field_label: f.field_label,
          field_type: f.field_type,
          placeholder: f.placeholder,
          required: f.required,
          readonly: f.readonly,
          hidden: f.hidden,
          default_value: f.default_value,
          formula: f.formula,
          options_json: f.options_json,
          min_value: f.min_value,
          max_value: f.max_value,
          position: i
        }));

      if (fieldsToInsert.length > 0) {
        const { error: fErr } = await supabase
         .from("template_fields")
         .insert(fieldsToInsert);

        if (fErr) throw fErr;
      }

      alert("✅ Template Saved Successfully");
      dispatch("saved", newTemplate);

      // Reset form
      template = { template_code: "", name: "", department: "Production", category: "Production", version: 1, color: "#2563eb", icon: "📄", description: "" };
      fields = [fields[0]];

    } catch (e: any) {
      console.error(e);
      alert("Save Failed: " + e.message);
    }
  }
</script>

<h2>Create Template</h2>

<input bind:value={template.template_code} placeholder="Template Code" />
<input bind:value={template.name} placeholder="Template Name" />
<input bind:value={template.department} placeholder="Department" />
<input bind:value={template.category} placeholder="Category" />
<input bind:value={template.version} type="number" />
<input type="color" bind:value={template.color} />
<input bind:value={template.icon} placeholder="Icon" />
<textarea bind:value={template.description} placeholder="Description"></textarea>

<h3>Fields</h3>

{#each fields as field, i}
<div class="field">
    <input bind:value={field.field_label} placeholder="Label" />
    <input bind:value={field.field_name} placeholder="Field Name" />

    <select bind:value={field.field_type}>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="time">Time</option>
        <option value="textarea">Textarea</option>
        <option value="formula">Formula</option>
    </select>

    {#if field.field_type === "formula"}
        <input bind:value={field.formula} placeholder="(RetestQty/Input)*100" />
    {/if}
</div>
{/each}

<button on:click={addField}>➕ Add Field</button>
<button class="save" on:click={saveTemplate}>💾 Save Template</button>

<style>
input, select, textarea {
    width: 100%;
    margin: 8px 0;
    padding: 10px;
    box-sizing: border-box;
}
.field {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
}
.field input,.field select {
    flex: 1;
}
.save {
    margin-top: 20px;
    width: 100%;
    padding: 12px;
    background: #25D366;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
}
</style>