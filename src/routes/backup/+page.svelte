<script lang="ts">
  import {
    exportBackup,
    importBackup
  } from "$lib/services/backup";

  async function restoreFile(
    event: Event
  ) {
    const target =
      event.target as HTMLInputElement;

    const file = target.files?.[0];

    if (!file) return;

    const text = await file.text();

    const backupData = JSON.parse(text);

    await importBackup(backupData);
  }
</script>

<h1>Backup & Restore</h1>

<button on:click={exportBackup}>
  Export Backup
</button>

<br /><br />

<input
  type="file"
  accept=".json"
  on:change={restoreFile}
/>