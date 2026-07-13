<script lang="ts">
  import { extractActions }
    from "$lib/services/aiActions";

  let notes = "";

  let actions: any[] = [];

  function generateActions() {
    actions = extractActions(notes);
  }
</script>

<h1>AI Action Extraction</h1>

<textarea
  bind:value={notes}
  placeholder="Paste meeting notes"
></textarea>

<button on:click={generateActions}>
  Extract Actions
</button>

{#if actions.length > 0}
  <h2>Detected Actions</h2>

  <table>
    <thead>
      <tr>
        <th>Task</th>
        <th>Owner</th>
        <th>Status</th>
      </tr>
    </thead>

    <tbody>
      {#each actions as item}
        <tr>
          <td>{item.task}</td>
          <td>{item.owner}</td>
          <td>{item.status}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
textarea{
  width:100%;
  height:200px;
}

table{
  width:100%;
  margin-top:20px;
  border-collapse:collapse;
}

th,td{
  border:1px solid #ddd;
  padding:8px;
}
</style>