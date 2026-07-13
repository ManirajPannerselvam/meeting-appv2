<script lang="ts">
  let title = "";
  let frequency = "Weekly";

  let recurringMeetings: { title: string; frequency: string }[] = [];

  function addRecurringMeeting() {
    recurringMeetings = [
      ...recurringMeetings,
      {
        title,
        frequency
      }
    ];

    title = "";
    frequency = "Weekly";
  }
</script>

<h1>Recurring Meetings</h1>

<div class="form">
  <input
    bind:value={title}
    placeholder="Meeting Title"
  />

  <select bind:value={frequency}>
    <option>Daily</option>
    <option>Weekly</option>
    <option>Monthly</option>
  </select>

  <button on:click={addRecurringMeeting}>
    Add
  </button>
</div>

<table>
  <thead>
    <tr>
      <th>Meeting</th>
      <th>Frequency</th>
    </tr>
  </thead>

  <tbody>
    {#each recurringMeetings as meeting}
      <tr>
        <td>{meeting.title}</td>
        <td>{meeting.frequency}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
.form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input,
select {
  padding: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ddd;
  padding: 10px;
}
</style>