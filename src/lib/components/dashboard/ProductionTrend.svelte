<script lang="ts">
    export let production: any[] = [];

    $: last7 = [...production]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7);

    $: maxValue = Math.max(
        ...last7.map(r => Number(r.target || 0)),
        1
    );

    function percent(value: number) {
        return (value / maxValue) * 100;
    }

    $: totalTarget = last7.reduce((t, r) => t + Number(r.target || 0), 0);

    $: totalActual = last7.reduce((t, r) => t + Number(r.actual || 0), 0);

    $: totalGood = last7.reduce((t, r) => t + Number(r.good || 0), 0);

    $: totalNG = last7.reduce((t, r) => t + Number(r.ng || 0), 0);

    $: avgYield = last7.length
        ? (
              last7.reduce((t, r) => t + Number(r.yield || 0), 0) /
              last7.length
          ).toFixed(2)
        : "0";

    $: avgOEE = last7.length
        ? (
              last7.reduce((t, r) => t + Number(r.oee || 0), 0) /
              last7.length
          ).toFixed(1)
        : "0";
</script>

<div class="card">

    <div class="title">

        <h2>📈 Production Trend (Last 7 Days)</h2>

    </div>

    {#if last7.length === 0}

        <div class="empty">

            No production data available.

        </div>

    {:else}

        <div class="chart">

            {#each last7 as row}

                <div class="column">

                    <div class="bars">

                        <div
                            class="target"
                            style={`height:${percent(Number(row.target || 0))}%`}
                            title={`Target : ${row.target}`}
                        ></div>

                        <div
                            class="actual"
                            style={`height:${percent(Number(row.actual || 0))}%`}
                            title={`Actual : ${row.actual}`}
                        ></div>

                    </div>

                    <small>{row.date}</small>

                </div>

            {/each}

        </div>

    {/if}

    <div class="summary">

        <div>

            <label>Total Target</label>

            <strong>{totalTarget.toLocaleString()}</strong>

        </div>

        <div>

            <label>Total Actual</label>

            <strong>{totalActual.toLocaleString()}</strong>

        </div>

        <div>

            <label>Good Qty</label>

            <strong>{totalGood.toLocaleString()}</strong>

        </div>

        <div>

            <label>NG Qty</label>

            <strong>{totalNG.toLocaleString()}</strong>

        </div>

        <div>

            <label>Yield</label>

            <strong>{avgYield}%</strong>

        </div>

        <div>

            <label>OEE</label>

            <strong>{avgOEE}%</strong>

        </div>

    </div>

</div>

<style>

.card{

background:white;

padding:22px;

border-radius:16px;

box-shadow:0 6px 18px rgba(0,0,0,.08);

margin-top:20px;

}

.title{

margin-bottom:20px;

}

.chart{

display:flex;

align-items:flex-end;

justify-content:space-between;

height:260px;

gap:18px;

}

.column{

display:flex;

flex-direction:column;

align-items:center;

flex:1;

}

.bars{

display:flex;

align-items:flex-end;

gap:6px;

height:220px;

width:100%;

justify-content:center;

}

.target{

width:18px;

background:#94a3b8;

border-radius:6px 6px 0 0;

}

.actual{

width:18px;

background:#2563eb;

border-radius:6px 6px 0 0;

}

.summary{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(180px,1fr));

gap:18px;

margin-top:25px;

}

.summary div{

background:#f8fafc;

padding:15px;

border-radius:12px;

text-align:center;

}

.summary label{

display:block;

color:#64748b;

font-size:13px;

margin-bottom:8px;

}

.summary strong{

font-size:22px;

color:#1e293b;

}

.empty{

padding:60px;

text-align:center;

color:#64748b;

}

@media(max-width:768px){

.chart{

overflow-x:auto;

justify-content:flex-start;

padding-bottom:10px;

}

.column{

min-width:70px;

}

.summary{

grid-template-columns:repeat(2,1fr);

}

}

</style>