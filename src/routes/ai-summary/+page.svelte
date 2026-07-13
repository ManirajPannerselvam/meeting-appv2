<script lang="ts">
  import { generateMeetingSummary }
    from "$lib/services/aiSummary";

  let agenda = "";
  let discussion = "";

  let result: any = null;

  function generate() {
    result =
      generateMeetingSummary(
        agenda,
        discussion
      );
  }
</script>

<h1>AI Meeting Summary</h1>

<input
  bind:value={agenda}
  placeholder="Meeting Agenda"
/>

<textarea
  bind:value={discussion}
  placeholder="Discussion Notes"
></textarea>

<button on:click={generate}>
  Generate Summary
</button>

{#if result}
  <h2>Summary</h2>
  <p>{result.summary}</p>

  <h2>Decisions</h2>
  <ul>
    {#each result.decisions as item}
      <li>{item}</li>
    {/each}
  </ul>

  <h2>Actions</h2>
  <ul>
    {#each result.actions as item}
      <li>{item}</li>
    {/each}
  </ul>

  <h2>Risks</h2>
  <ul>
    {#each result.risks as item}
      <li>{item}</li>
    {/each}
  </ul>

  <h2>Next Steps</h2>
  <ul>
    {#each result.nextSteps as item}
      <li>{item}</li>
    {/each}
  </ul>
{/if}