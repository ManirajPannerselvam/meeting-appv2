<script lang="ts">
    export let downtime = [];

    $: totalMinutes =
        downtime.reduce(
            (t, r) => t + Number(r.duration_min || 0),
            0
        );

    $: totalMachines =
        [...new Set(downtime.map(r => r.machine))].length;

    $: highest =
        downtime.length
            ? downtime.reduce((a, b) =>
                Number(a.duration_min) >
                Number(b.duration_min)
                    ? a
                    : b)
            : null;
</script>

<div class="summary-card">

    <h3>🏭 Machine Downtime</h3>

    <div class="grid">

        <div class="box">
            <label>Total Minutes</label>
            <h2>{totalMinutes}</h2>
        </div>

        <div class="box">
            <label>Machines</label>
            <h2>{totalMachines}</h2>
        </div>

        <div class="box">
            <label>Highest</label>

            {#if highest}
                <h2>{highest.machine}</h2>
                <small>{highest.duration_min} min</small>
            {:else}
                <h2>-</h2>
            {/if}

        </div>

    </div>

</div>

<style>

.summary-card{

background:white;

padding:20px;

border-radius:14px;

box-shadow:0 5px 15px rgba(0,0,0,.08);

}

.grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(180px,1fr));

gap:15px;

margin-top:15px;

}

.box{

background:#f8fafc;

padding:15px;

border-radius:10px;

text-align:center;

}

.box label{

display:block;

color:#64748b;

margin-bottom:8px;

}

.box h2{

margin:0;

}

</style>