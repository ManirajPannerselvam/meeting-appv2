<script lang="ts">
  let selectedFiles: FileList | null = null;

  function handleFiles(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedFiles = target.files;
  }
</script>

<h1>File Attachments</h1>

<input
  type="file"
  multiple
  on:change={handleFiles}
/>

{#if selectedFiles}
  <h3>Selected Files</h3>

  <ul>
    {#each Array.from(selectedFiles) as file}
      <li>
        {file.name} ({Math.round(file.size / 1024)} KB)
      </li>
    {/each}
  </ul>
{/if}