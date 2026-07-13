<script lang="ts">

export let summary:any={};

</script>

<div class="kpi-grid">

    <div class="kpi">
        <h4>🎯 Target</h4>
        <h1>{summary.target ?? 0}</h1>
    </div>

    <div class="kpi">
        <h4>✅ Actual</h4>
        <h1>{summary.actual ?? 0}</h1>
    </div>

    <div class="kpi">
        <h4>❌ Reject</h4>
        <h1>{summary.reject ?? 0}</h1>
    </div>

    <div class="kpi">
        <h4>📈 Achievement</h4>
        <h1>{summary.achievement ?? 0}%</h1>
    </div>

</div>

<style>

.kpi-grid{

display:grid;

grid-template-columns:repeat(4,1fr);

gap:20px;

}

.kpi{

background:white;

padding:25px;

border-radius:16px;

box-shadow:0 5px 20px rgba(0,0,0,.08);

text-align:center;

}

.kpi h1{

margin:0;

color:#25D366;

font-size:34px;

}

</style>