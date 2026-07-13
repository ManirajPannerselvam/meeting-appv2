<script lang="ts">
  let searchText = "";

  let meetings = [
    {
      title: "Weekly RF Review",
      owner: "Mani",
      status: "Completed"
    },
    {
      title: "Project Planning",
      owner: "Ravi",
      status: "Open"
    },
    {
      title: "Management Review",
      owner: "Kumar",
      status: "Open"
    }
  ];

  $: filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.title
        .toLowerCase()
        .includes(searchText.toLowerCase()) ||
      meeting.owner
        .toLowerCase()
        .includes(searchText.toLowerCase())
  );
</script>

<h1>Search Meetings</h1>

<input
  bind:value={searchText}
  placeholder="Search by title or owner..."
/>

<table>
  <thead>
    <tr>
      <th>Title</th>
      <th>Owner</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
    {#each filteredMeetings as meeting}
      <tr>
        <td>{meeting.title}</td>
        <td>{meeting.owner}</td>
        <td>{meeting.status}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
input{
  width:100%;
  padding:10px;
  margin-bottom:15px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th, td{
  border:1px solid #ddd;
  padding:10px;
}
</style>