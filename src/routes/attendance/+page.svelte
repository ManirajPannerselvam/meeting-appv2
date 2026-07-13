<script lang="ts">
  import {
    saveAttendance,
    getAttendance
  } from "$lib/services/database";

  import { onMount } from "svelte";

  let meetingId = "";
  let employeeName = "";
  let status = "Present";

  let attendance: any[] = [];

  async function loadAttendance() {
    attendance = await getAttendance();
  }

  async function markAttendance() {
    await saveAttendance({
      meetingId,
      employeeName,
      status
    });

    employeeName = "";
    status = "Present";

    await loadAttendance();
  }

  onMount(loadAttendance);
</script>

<h1>Attendance Management</h1>

<div class="form">
  <input
    bind:value={meetingId}
    placeholder="Meeting ID"
  />

  <input
    bind:value={employeeName}
    placeholder="Employee Name"
  />

  <select bind:value={status}>
    <option>Present</option>
    <option>Absent</option>
    <option>Late</option>
  </select>

  <button on:click={markAttendance}>
    Save Attendance
  </button>
</div>

<table>
  <thead>
    <tr>
      <th>Meeting</th>
      <th>Employee</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
    {#each attendance as item}
      <tr>
        <td>{item.meeting_id}</td>
        <td>{item.employee_name}</td>
        <td>{item.status}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
.form{
  display:flex;
  gap:10px;
  margin-bottom:20px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  border:1px solid #ddd;
  padding:10px;
}
</style>