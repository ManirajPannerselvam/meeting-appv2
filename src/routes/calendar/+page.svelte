<script lang="ts">
  import { onMount } from "svelte";
  import { getMeetings } from "$lib/services/database";

  let meetings: any[] = [];

  onMount(async () => {
    try {
      meetings = await getMeetings();
    } catch (err) {
      console.error("Failed to load meetings", err);
    }
  });
</script>

<h1>📅 Meeting Calendar</h1>

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Meeting</th>
      <th>Type</th>
      <th>Location</th>
    </tr>
  </thead>

  <tbody>
    {#each meetings as meeting}
      <tr>
        <td>{meeting.date}</td>
        <td>{meeting.title}</td>
        <td>{meeting.type}</td>
        <td>{meeting.location}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ddd;
  padding: 10px;
}

th {
  background: #f5f5f5;
}
</style>