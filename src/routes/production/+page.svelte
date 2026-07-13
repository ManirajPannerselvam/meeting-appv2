<script lang="ts">
    let form = {
        customer: "",
        model: "",
        line: "",
        shift: "A",
        target: 0,
        actual: 0,
        ng: 0,
        downtime: 0,
        operator: "",
        remarks: ""
    };

    let yieldPercent = 0;
    let rrPercent = 0;
    let uph = 0;

    function calculate() {
        const actual = Number(form.actual) || 0;
        const ng = Number(form.ng) || 0;
        const total = actual + ng;

        yieldPercent = total > 0
            ? Number(((actual / total) * 100).toFixed(2))
            : 0;

        rrPercent = total > 0
            ? Number(((ng / total) * 100).toFixed(2))
            : 0;

        // UPH = Units per hour (assuming 8 hours shift)
        uph = actual > 0 ? Number((actual / 8).toFixed(0)) : 0;
    }

    function saveProduction() {
        calculate();
        alert("Production Saved (SQLite integration next)");
    }
</script>

<div class="page">
    <h1>🏭 Production Entry</h1>

    <div class="card">
        <div class="grid">
            <input placeholder="Customer" bind:value={form.customer}>
            <input placeholder="Model" bind:value={form.model}>
            <input placeholder="Production Line" bind:value={form.line}>
            
            <select bind:value={form.shift}>
                <option value="A">A Shift</option>
                <option value="B">B Shift</option>
                <option value="C">C Shift</option>
            </select>

            <input
                type="number"
                placeholder="Target Qty"
                bind:value={form.target}
                on:input={calculate}
            />

            <input
                type="number"
                placeholder="Actual Qty"
                bind:value={form.actual}
                on:input={calculate}
            />

            <input
                type="number"
                placeholder="NG Qty"
                bind:value={form.ng}
                on:input={calculate}
            />

            <input
                type="number"
                placeholder="Downtime (Minutes)"
                bind:value={form.downtime}
            />

            <input
                placeholder="Operator"
                bind:value={form.operator}
            />

            <textarea
                rows="4"
                placeholder="Remarks"
                bind:value={form.remarks}
            ></textarea>
        </div>

        <div class="kpi">
            <div class="box green">
                <h2>{yieldPercent}%</h2>
                <p>Yield</p>
            </div>

            <div class="box red">
                <h2>{rrPercent}%</h2>
                <p>RR</p>
            </div>

            <div class="box blue">
                <h2>{uph}</h2>
                <p>UPH</p>
            </div>
        </div>

        <h2>📊 Live Summary</h2>
        <table class="summary">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Yield</td>
                    <td>{yieldPercent}%</td>
                </tr>
                <tr>
                    <td>RR</td>
                    <td>{rrPercent}%</td>
                </tr>
                <tr>
                    <td>UPH</td>
                    <td>{uph}</td>
                </tr>
            </tbody>
        </table>

        <button class="save" on:click={saveProduction}>
            💾 Save Production
        </button>
    </div>
</div>

<style>
.page{
    padding:25px;
    background:#eef3f8;
    min-height:100vh;
}

.card{
    background:white;
    padding:25px;
    border-radius:18px;
    box-shadow:0 5px 18px rgba(0,0,0,.08);
}

.grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:15px;
}

input,
select,
textarea{
    padding:12px;
    border-radius:10px;
    border:1px solid #d6dbe5;
    font-size:15px;
}

textarea{
    grid-column:1/3;
}

.kpi{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:15px;
    margin-top:25px;
}

.box{
    padding:20px;
    border-radius:14px;
    color:white;
    text-align:center;
}

.green{background:#16a34a;}
.red{background:#dc2626;}
.blue{background:#2563eb;}

.summary{
    width:100%;
    margin-top:25px;
    border-collapse:collapse;
    border:1px solid #d6dbe5;
    border-radius:10px;
    overflow:hidden;
}

.summary th{
    background:#f1f5f9;
    padding:12px;
    text-align:left;
    font-weight:600;
}

.summary td{
    padding:12px;
    border-top:1px solid #e2e8f0;
}

.save{
    margin-top:25px;
    width:100%;
    padding:14px;
    background:#16a34a;
    color:white;
    border:none;
    border-radius:10px;
    cursor:pointer;
    font-size:16px;
    font-weight:bold;
}

@media (max-width: 768px) {
    .grid{
        grid-template-columns: 1fr;
    }
    textarea{
        grid-column:1/2;
    }
    .kpi{
        grid-template-columns: 1fr;
    }
}
</style>
