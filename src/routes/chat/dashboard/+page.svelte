<script>

import { onMount } from "svelte";

let reports=[];

onMount(async()=>{

    const res=await fetch("/api/template-report/list");

    const data=await res.json();

    reports=data.reports;

});

</script>

<h1>

📊 Dashboard

</h1>

<div class="cards">

<div class="card">

<h2>{reports.length}</h2>

<p>Total Reports</p>

</div>

</div>