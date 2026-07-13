<script lang="ts">
import { onMount } from "svelte";
import KPICards from "$lib/components/dashboard/KPICards.svelte";

let summary: any = {
    actual: 0,
    reject: 0,
    achievement: 0
};
let loading = true;

async function load() {
    try {
        const r = await fetch("/api/reports/dashboard");
        summary = await r.json();
    } catch (err) {
        console.error("Dashboard load error:", err);
    } finally {
        loading = false;
    }
}

onMount(load);
</script>

<main class="container">
    <h1>Production Dashboard</h1>

    {#if loading}
        <div class="loading">Loading...</div>
    {:else}
        <!-- Option 1: Use KPICards component only -->
        <KPICards {summary} />

        <!-- Option 2: If you want custom cards instead of KPICards, use this -->
        <!-- 
        <div class="cards">
            <div class="card">
                <h2>Actual</h2>
                <h1>{summary.actual || 0}</h1>
            </div>

            <div class="card">
                <h2>Reject</h2>
                <h1>{summary.reject || 0}</h1>
            </div>

            <div class="card">
                <h2>Achievement</h2>
                <h1>{summary.achievement || 0}%</h1>
            </div>

            <div class="card">
                <h2>Target</h2>
                <h1>{summary.target || 0}</h1>
            </div>
        -->

        <div class="graph">
            <h2>Hourly Production Graph</h2>
            <!-- Add your chart component here -->
            <!-- Example: <Chart data={summary.hourlyData} /> -->
        </div>
    {/if}
</main>

<style>
.container {
    padding: 20px;
    background: #f0f2f5;
    min-height: 100vh;
}

h1 {
    margin-bottom: 20px;
    color: #1e293b;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #666;
}

.cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-top: 20px;
}

.card {
    background: white;
    padding: 20px;
    border-radius: 15px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, .1);
    text-align: center;
}

.card h2 {
    font-size: 14px;
    color: #64748b;
    margin: 0 0 10px 0;
    text-transform: uppercase;
}

.card h1 {
    font-size: 32px;
    color: #1e293b;
    margin: 0;
}

.graph {
    margin-top: 30px;
    height: 420px;
    background: white;
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, .1);
}

.graph h2 {
    margin: 0 0 20px 0;
    color: #1e293b;
}

@media (max-width: 768px) {
    .cards {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 480px) {
    .cards {
        grid-template-columns: 1fr;
    }
}
</style>