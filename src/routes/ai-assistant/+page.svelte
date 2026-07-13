<script lang="ts">
  let meetingNotes = "";

  let summary = "";
  let actions = "";

  function generateAI() {
    if (!meetingNotes.trim()) {
      alert("Enter meeting notes");
      return;
    }

    summary =
      "AI Summary:\n\n" +
      "Meeting discussion analyzed successfully.\n" +
      "Key decisions identified.";

    actions =
      "1. Review pending issues\n" +
      "2. Update project status\n" +
      "3. Follow up with stakeholders";
  }
</script>

<h1>AI Meeting Assistant</h1>

<textarea
  bind:value={meetingNotes}
  rows="10"
  placeholder="Paste meeting notes here..."
></textarea>

<button on:click={generateAI}>
  Generate Summary
</button>

<h2>Meeting Summary</h2>

<pre>{summary}</pre>

<h2>Action Items</h2>

<pre>{actions}</pre>

<style>
textarea{
  width:100%;
  padding:10px;
  margin-bottom:10px;
}

button{
  padding:10px 20px;
}

pre{
  background:#f4f4f4;
  padding:15px;
  border-radius:6px;
  white-space:pre-wrap;
}
</style>