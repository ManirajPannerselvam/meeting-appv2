<script lang="ts">
  import {
    saveEmployee,
    getEmployees
  } from "$lib/services/database";

  import { onMount } from "svelte";

  let employees:any[]=[];

  let employeeId="";
  let name="";
  let email="";
  let department="";
  let designation="";

  async function loadData(){
    employees = await getEmployees();
  }

  async function save(){
    await saveEmployee({
      employeeId,
      name,
      email,
      department,
      designation
    });

    employeeId="";
    name="";
    email="";
    department="";
    designation="";

    await loadData();
  }

  onMount(loadData);
</script>

<h1>Employee Management</h1>

<div class="form">

<input bind:value={employeeId}
placeholder="Employee ID" />

<input bind:value={name}
placeholder="Employee Name" />

<input bind:value={email}
placeholder="Email" />

<input bind:value={department}
placeholder="Department" />

<input bind:value={designation}
placeholder="Designation" />

<button on:click={save}>
Save Employee
</button>

</div>

<table>
<thead>
<tr>
<th>ID</th>
<th>Name</th>
<th>Department</th>
<th>Designation</th>
</tr>
</thead>

<tbody>
{#each employees as emp}
<tr>
<td>{emp.employee_id}</td>
<td>{emp.name}</td>
<td>{emp.department}</td>
<td>{emp.designation}</td>
</tr>
{/each}
</tbody>
</table>