<script lang="ts">
    import { goto } from "$app/navigation";
    import { addMachineDowntime } from "$lib/services/database";

    let form = {
        report_date: new Date().toISOString().split("T")[0],
        department: "",
        production_line: "",
        machine: "",
        reason: "",
        category: "",
        duration_min: 0,
        reported_by: "",
        action_taken: "",
        status: "Open"
    };

    let saving = false;

    async function save() {

        saving = true;

        try {

            await addMachineDowntime(form);

            alert("Downtime saved successfully.");

            goto("/machine-downtime");

        } catch (e) {

            console.error(e);

            alert("Failed to save.");

        }

        saving = false;

    }
</script>

<h1>➕ Add Machine Downtime</h1>

<div class="card">

    <div class="grid">

        <div>
            <label>Date</label>
            <input bind:value={form.report_date} type="date">
        </div>

        <div>
            <label>Department</label>
            <select bind:value={form.department}>
                <option value="">Select</option>
                <option>SMT</option>
                <option>FATP</option>
                <option>Warehouse</option>
                <option>Maintenance</option>
            </select>
        </div>

        <div>
            <label>Production Line</label>
            <input bind:value={form.production_line}>
        </div>

        <div>
            <label>Machine</label>
            <input bind:value={form.machine}>
        </div>

        <div>
            <label>Category</label>
            <select bind:value={form.category}>
                <option value="">Select</option>
                <option>Breakdown</option>
                <option>Maintenance</option>
                <option>Power</option>
                <option>Quality</option>
                <option>Material</option>
                <option>Setup</option>
                <option>Other</option>
            </select>
        </div>

        <div>
            <label>Duration (Minutes)</label>
            <input
                bind:value={form.duration_min}
                type="number"
                min="0">
        </div>

    </div>

    <label>Reason</label>

    <textarea
        rows="3"
        bind:value={form.reason}>
    </textarea>

    <label>Action Taken</label>

    <textarea
        rows="3"
        bind:value={form.action_taken}>
    </textarea>

    <div class="grid">

        <div>
            <label>Reported By</label>
            <input bind:value={form.reported_by}>
        </div>

        <div>
            <label>Status</label>
            <select bind:value={form.status}>
                <option>Open</option>
                <option>Closed</option>
            </select>
        </div>

    </div>

    <button
        disabled={saving}
        on:click={save}>

        {saving ? "Saving..." : "Save Downtime"}

    </button>

</div>

<style>

h1{

    margin-bottom:20px;

}

.card{

    background:white;
    padding:25px;
    border-radius:14px;
    box-shadow:0 5px 15px rgba(0,0,0,.08);

}

.grid{

    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    gap:20px;
    margin-bottom:20px;

}

label{

    display:block;
    margin-bottom:6px;
    color:#64748b;
    font-weight:bold;

}

input,
select,
textarea{

    width:100%;
    padding:10px;
    border:1px solid #d1d5db;
    border-radius:8px;
    box-sizing:border-box;

}

textarea{

    margin-bottom:20px;

}

button{

    background:#2563eb;
    color:white;
    border:none;
    padding:12px 20px;
    border-radius:8px;
    cursor:pointer;
    font-size:16px;

}

button:disabled{

    opacity:.6;

}

@media(max-width:768px){

.grid{

    grid-template-columns:1fr;

}

}

</style>