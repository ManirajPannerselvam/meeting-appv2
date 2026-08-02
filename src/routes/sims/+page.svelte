<script lang="ts">
  import { onMount } from "svelte";

  type SIM = {
    id?: string;
    sim_number?: string;
    operator_name?: string;
    circle?: string;
    plan_name?: string;
    monthly_cost?: number;
    assigned_device?: string;
    owner?: string;
    status?: string;
    remarks?: string;
  };


  let sims: SIM[] = [];


  let simNumber = "";
  let operatorName = "";
  let circle = "";
  let planName = "";
  let monthlyCost = 0;
  let assignedDevice = "";
  let owner = "";
  let status = "Available";
  let remarks = "";


  async function loadData() {

    try {

      const response = await fetch("/api/sims");

      if (!response.ok) {
        throw new Error("Failed to load SIMs");
      }

      sims = await response.json();

    } catch (err) {

      console.error(
        "Failed to load SIMs:",
        err
      );

    }

  }



  async function save() {

    try {

      const response = await fetch(
        "/api/sims",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            sim_number: simNumber,
            operator_name: operatorName,
            circle,
            plan_name: planName,
            monthly_cost: Number(monthlyCost),
            assigned_device: assignedDevice,
            owner,
            status,
            remarks

          })

        }
      );


      if (!response.ok) {

        throw new Error(
          "Failed to save SIM"
        );

      }


      await loadData();


      simNumber = "";
      operatorName = "";
      circle = "";
      planName = "";
      monthlyCost = 0;
      assignedDevice = "";
      owner = "";
      status = "Available";
      remarks = "";


    } catch (err) {

      console.error(
        "Failed to save SIM:",
        err
      );

    }

  }



  onMount(() => {

    loadData();

  });

</script>



<h1>SIM Inventory</h1>


<div>

  <input bind:value={simNumber}
    placeholder="SIM Number" />


  <input bind:value={operatorName}
    placeholder="Operator" />


  <input bind:value={circle}
    placeholder="Circle" />


  <input bind:value={planName}
    placeholder="Plan" />


  <input
    type="number"
    bind:value={monthlyCost}
    placeholder="Monthly Cost"
  />


  <input bind:value={assignedDevice}
    placeholder="Assigned Device" />


  <input bind:value={owner}
    placeholder="Owner" />


  <select bind:value={status}>

    <option value="Available">
      Available
    </option>

    <option value="In Use">
      In Use
    </option>

    <option value="Expired">
      Expired
    </option>

    <option value="Blocked">
      Blocked
    </option>

  </select>


  <input bind:value={remarks}
    placeholder="Remarks" />


  <button onclick={save}>
    Save SIM
  </button>

</div>



<table border="1">

<thead>

<tr>

<th>SIM</th>
<th>Operator</th>
<th>Circle</th>
<th>Status</th>

</tr>

</thead>


<tbody>

{#each sims as sim (sim.id ?? sim.sim_number)}

<tr>

<td>
{sim.sim_number}
</td>


<td>
{sim.operator_name}
</td>


<td>
{sim.circle}
</td>


<td>
{sim.status}
</td>


</tr>

{/each}

</tbody>


</table>