<script lang="ts">
  let stats = {
    totalMeetings: 0,
    totalActions: 0,
    pendingActions: 0,
    completedActions: 0
  };

  let meetingNotes = "";

  let mom = "";
  let actionItems: string[] = [];

  function generateMoM() {
    if (!meetingNotes.trim()) {
      alert("Enter meeting notes");
      return;
    }

    mom =
      "Meeting Summary:\n\n" +
      "Discussion captured successfully.\n" +
      "Key topics reviewed and decisions noted.";

    actionItems = [
      "Follow up on pending RF issues",
      "Validate test results",
      "Prepare weekly report"
    ];
  }
</script>

<h1>Meeting Minutes (MoM)</h1>

<textarea
  bind:value={meetingNotes}
  placeholder="Enter meeting discussion notes..."
  rows="10"
></textarea>

<button on:click={generateMoM}>
  Generate MoM
</button>

<h2>Summary</h2>
<pre>{mom}</pre>

<h2>Action Items</h2>

<ul>
  {#each actionItems as item}
    <li>{item}</li>
  {/each}
</ul>

<style>
  textarea {
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
  }

  button {
    padding: 10px 20px;
    margin-bottom: 20px;
  }

  pre {
    background: #f4f4f4;
    padding: 15px;
    white-space: pre-wrap;
  }
</style>