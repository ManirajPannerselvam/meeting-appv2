<script lang="ts">
  let meetingId = 1;

  let file: File | null = null;

  function handleFile(
    event: Event
  ) {
    const target =
      event.target as HTMLInputElement;

    file =
      target.files?.[0] || null;
  }

  async function uploadFile() {
    if (!file) return;

    alert(
      `Selected: ${file.name}`
    );
  }
</script>

<h1>Meeting Attachments</h1>

<input
  type="file"
  on:change={handleFile}
/>

<button on:click={uploadFile}>
  Upload
</button>