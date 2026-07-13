<script lang="ts">
  import {
    saveRecurringMeeting,
    getRecurringMeetings
  } from "$lib/services/database";

  import { onMount } from "svelte";

  let title = "";
  let frequency = "Weekly";
  let nextRun = "";
  let participants = "";
  let agenda = "";

  let meetings: any[] = [];

  async function loadMeetings() {
    meetings = await getRecurringMeetings();
  }

  async function save() {
    await saveRecurringMeeting({
      title,
      frequency,
      nextRun,
      participants,
      agenda
    });

    title = "";
    participants = "";
    agenda = "";

    await loadMeetings();
  }

  onMount(loadMeetings);
</script>

<h1>Recurring Meetings</h1>

<div class="form">
  <input bind:value={title} placeholder="Meeting Title" />

  <select bind:value={frequency}>
    <option>Daily</option>
    <option>Weekly</option>
    <option>Monthly</option>
    <option>Quarterly</option>
    <option>Yearly</option>
  </select>

  <input type="date" bind:value={nextRun} />

  <input
    bind:value={participants}
    placeholder="Participants"
  />

  <textarea
    bind:value={agenda}
    placeholder="Agenda"
  ></textarea>

  <button on:click={save}>
    Save Recurring Meeting
  </button>
</div>

<hr>

<h2>Saved Recurring Meetings</h2>

<table>
  <thead>
    <tr>
      <th>Title</th>
      <th>Frequency</th>
      <th>Next Run</th>
    </tr>
  </thead>

  <tbody>
    {#each meetings as meeting}
      <tr>
        <td>{meeting.title}</td>
        <td>{meeting.frequency}</td>
        <td>{meeting.next_run}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
.form{
  display:flex;
  flex-direction:column;
  gap:10px;
}

textarea{
  min-height:100px;
}

table{
  width:100%;
  border-collapse:collapse;
  margin-top:20px;
}

th,td{
  border:1px solid #ddd;
  padding:10px;
}
</style>