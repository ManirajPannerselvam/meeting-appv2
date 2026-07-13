<script lang="ts">
  import {
    saveSkill,
    getSkills
  } from "$lib/services/database";

  import { onMount } from "svelte";

  let skills:any[]=[];

  let employeeId="";
  let skillName="";
  let level="Beginner";

  async function loadData() {
    skills = await getSkills();
  }

  async function save() {
    await saveSkill({
      employeeId,
      skillName,
      level
    });

    employeeId="";
    skillName="";
    level="Beginner";

    await loadData();
  }

  onMount(loadData);
</script>

<h1>Skill Matrix</h1>

<input
  bind:value={employeeId}
  placeholder="Employee ID"
/>

<input
  bind:value={skillName}
  placeholder="Skill Name"
/>

<select bind:value={level}>
  <option>Beginner</option>
  <option>Intermediate</option>
  <option>Advanced</option>
  <option>Expert</option>
</select>

<button on:click={save}>
  Save Skill
</button>

<table>
  <thead>
    <tr>
      <th>Employee</th>
      <th>Skill</th>
      <th>Level</th>
    </tr>
  </thead>

  <tbody>
    {#each skills as skill}
      <tr>
        <td>{skill.employee_id}</td>
        <td>{skill.skill_name}</td>
        <td>{skill.level}</td>
      </tr>
    {/each}
  </tbody>
</table>