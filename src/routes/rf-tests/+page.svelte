<script lang="ts">
  import {
    saveRFTest,
    getRFTests
  } from "$lib/services/database";

  import { onMount } from "svelte";

  let tests: any[] = [];

  let deviceModel = "";
  let testCase = "";
  let result = "PASS";
  let tester = "";
  let testDate = "";

  async function loadData() {
    tests = await getRFTests();
  }

  async function save() {
    await saveRFTest({
      deviceModel,
      testCase,
      result,
      tester,
      testDate
    });

    await loadData();

    deviceModel = "";
    testCase = "";
    tester = "";
    testDate = "";
    result = "PASS";
  }

  onMount(loadData);
</script>

<h1>RF Test Tracker</h1>

<div>
  <input
    bind:value={deviceModel}
    placeholder="Device Model"
  />

  <input
    bind:value={testCase}
    placeholder="Test Case"
  />

  <input
    bind:value={tester}
    placeholder="Tester Name"
  />

  <input
    type="date"
    bind:value={testDate}
  />

  <select bind:value={result}>
    <option value="PASS">PASS</option>
    <option value="FAIL">FAIL</option>
    <option value="BLOCKED">BLOCKED</option>
  </select>

  <button on:click={save}>
    Save Result
  </button>
</div>

<h2>RF Test Results</h2>

<table border="1">
  <thead>
    <tr>
      <th>Device</th>
      <th>Test Case</th>
      <th>Result</th>
      <th>Tester</th>
      <th>Date</th>
    </tr>
  </thead>

  <tbody>
    {#each tests as item}
      <tr>
        <td>{item.device_model}</td>
        <td>{item.test_case}</td>
        <td>{item.result}</td>
        <td>{item.tester}</td>
        <td>{item.test_date}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  input,
  select,
  button {
    margin: 5px;
    padding: 8px;
  }

  table {
    margin-top: 20px;
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 8px;
    text-align: left;
  }
</style>