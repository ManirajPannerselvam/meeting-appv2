<script lang="ts">
  let task = "";
  let owner = "";
  let dueDate = "";

  let actions = [
    {
      task: "RF Test Review",
      owner: "Mani",
      dueDate: "2026-06-15",
      status: "Open"
    }
  ];

  function addAction() {
    if (!task || !owner || !dueDate) {
      alert("Fill all fields");
      return;
    }

    actions = [
      ...actions,
      {
        task,
        owner,
        dueDate,
        status: "Open"
      }
    ];

    task = "";
    owner = "";
    dueDate = "";
  }

  function updateStatus(index: number) {
    if (actions[index].status === "Open")
      actions[index].status = "In Progress";
    else if (actions[index].status === "In Progress")
      actions[index].status = "Closed";

    actions = [...actions];
  }
</script>

<h1>Action Tracker</h1>

<div class="form">
  <input bind:value={task} placeholder="Action Item" />
  <input bind:value={owner} placeholder="Owner" />
  <input type="date" bind:value={dueDate} />

  <button on:click={addAction}>
    Add Action
  </button>
</div>

<table>
  <thead>
    <tr>
      <th>Task</th>
      <th>Owner</th>
      <th>Due Date</th>
      <th>Status</th>
      <th>Update</th>
    </tr>
  </thead>

  <tbody>
    {#each actions as item, index}
      <tr>
        <td>{item.task}</td>
        <td>{item.owner}</td>
        <td>{item.dueDate}</td>
        <td>{item.status}</td>
        <td>
          <button on:click={() => updateStatus(index)}>
            Next Status
          </button>
        </td>
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

input{
  padding:10px;
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