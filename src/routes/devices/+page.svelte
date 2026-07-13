<script lang="ts">
  import { saveDevice, getDevices } from "$lib/services/database";
  import { onMount } from "svelte";

  type Device = {
    device_model?: string;
    imei?: string;
    android_version?: string;
    build_version?: string;
    sim_number?: string;
    owner?: string;
    status?: string;
    remarks?: string;
  };

  let devices: Device[] = [];

  let deviceModel: string = "";
  let imei: string = "";
  let androidVersion: string = "";
  let buildVersion: string = "";
  let simNumber: string = "";
  let owner: string = "";
  let status: string = "Available";
  let remarks: string = "";

  async function loadData() {
    try {
      devices = await getDevices();
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  }

  async function save() {
    try {
      await saveDevice({
        deviceModel,
        imei,
        androidVersion,
        buildVersion,
        simNumber,
        owner,
        status,
        remarks
      });

      await loadData();

      // reset all fields
      deviceModel = "";
      imei = "";
      androidVersion = "";
      buildVersion = "";
      simNumber = "";
      owner = "";
      status = "Available";
      remarks = "";
    } catch (error) {
      console.error("Failed to save device:", error);
    }
  }

  onMount(loadData);
</script>

<h1>Device Inventory</h1>

<div>
  <input bind:value={deviceModel} placeholder="Device Model" />
  <input bind:value={imei} placeholder="IMEI" />
  <input bind:value={androidVersion} placeholder="Android Version" />
  <input bind:value={buildVersion} placeholder="Build Version" />
  <input bind:value={simNumber} placeholder="SIM Number" />
  <input bind:value={owner} placeholder="Owner" />

  <select bind:value={status}>
    <option value="Available">Available</option>
    <option value="In Use">In Use</option>
    <option value="Repair">Repair</option>
    <option value="Lost">Lost</option>
  </select>

  <input bind:value={remarks} placeholder="Remarks" />

  <button on:click={save}>
    Save Device
  </button>
</div>

<table border="1">
  <thead>
    <tr>
      <th>Model</th>
      <th>IMEI</th>
      <th>Owner</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
    {#each devices as d (d.imei)}
      <tr>
        <td>{d.device_model}</td>
        <td>{d.imei}</td>
        <td>{d.owner}</td>
        <td>{d.status}</td>
      </tr>
    {/each}
  </tbody>
</table>