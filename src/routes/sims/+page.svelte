<script lang="ts">
  import { onMount } from "svelte";
  import { saveSIM, getSIMs } from "$lib/services/database";

  type SIM = {
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

  let simNumber: string = "";
  let operatorName: string = "";
  let circle: string = "";
  let planName: string = "";
  let monthlyCost: number = 0;
  let assignedDevice: string = "";
  let owner: string = "";
  let status: string = "Available";
  let remarks: string = "";

  async function loadData() {
    try {
      sims = await getSIMs();
    } catch (err) {
      console.error("Failed to load SIMs:", err);
    }
  }

  async function save() {
    try {
      await saveSIM({
        simNumber,
        operatorName,
        circle,
        planName,
        monthlyCost,
        assignedDevice,
        owner,
        status,
        remarks
      });

      await loadData();

      // reset fields
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
      console.error("Failed to save SIM:", err);
    }
  }

  onMount(loadData);
</script>

<h1>SIM Inventory</h1>

<div>
  <input bind:value={simNumber} placeholder="SIM Number" />
  <input bind:value={operatorName} placeholder="Operator" />
  <input bind:value={circle} placeholder="Circle" />
  <input bind:value={planName} placeholder="Plan" />
  <input type="number" bind:value={monthlyCost} placeholder="Monthly Cost" />
  <input bind:value={assignedDevice} placeholder="Assigned Device" />
  <input bind:value={owner} placeholder="Owner" />

  <select bind:value={status}>
    <option value="Available">Available</option>
    <option value="In Use">In Use</option>
    <option value="Expired">Expired</option>
    <option value="Blocked">Blocked</option>
  </select>

  <input bind:value={remarks} placeholder="Remarks" />

  <button on:click={save}>
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
    {#each sims as sim (sim.sim_number)}
      <tr>
        <td>{sim.sim_number}</td>
        <td>{sim.operator_name}</td>
        <td>{sim.circle}</td>
        <td>{sim.status}</td>
      </tr>
    {/each}
  </tbody>
</table>