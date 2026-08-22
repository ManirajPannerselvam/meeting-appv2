<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { supabase } from "$lib/supabase/client";
import { toast } from "svelte-sonner"; // npm i svelte-sonner

interface KPI {
    totalRevenue: number; totalDonations: number; totalVisitors: number;
    totalBookings: number; monthlyRevenue: number; monthlyVisitors: number;
}

interface MonthlyMetric {
    month: string; revenue: number; donations: number; visitors: number; bookings: number;
}

type DonorSummary = { name: string; amount: number; };
type EventSummary = { name: string; count: number; };

let loading = true;
let kpi: KPI = { totalRevenue: 0, totalDonations: 0, totalVisitors: 0, totalBookings: 0, monthlyRevenue: 0, monthlyVisitors: 0 };

let selectedYear = new Date().getFullYear();
let selectedMonth = "All";

let monthlyMetrics: MonthlyMetric[] = [];
let revenueData: any[] = []; let visitorData: any[] = []; let bookingData: any[] = [];
let topDonors: DonorSummary[] = []; let topEvents: EventSummary[] = [];

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ===== LOAD ANALYTICS =====
async function loadAnalytics() {
    loading = true;
    try {
        const yearFilter = selectedYear;
        const monthFilter = selectedMonth !== "All" ? monthNames.indexOf(selectedMonth) : null;

        let startDate = new Date(yearFilter, 0, 1).toISOString();
        let endDate = new Date(yearFilter, 11, 31, 23, 59, 59).toISOString();

        if(monthFilter !== null){
            startDate = new Date(yearFilter, monthFilter, 1).toISOString();
            endDate = new Date(yearFilter, monthFilter + 1, 0, 23, 59, 59).toISOString();
        }

        // Fetch with filters
        const [donations, visitors, bookings] = await Promise.all([
            supabase.from("donations").select("*").gte("created_at", startDate).lte("created_at", endDate),
            supabase.from("visitors").select("*").gte("created_at", startDate).lte("created_at", endDate),
            supabase.from("bookings").select("*").gte("created_at", startDate).lte("created_at", endDate)
        ]);

        revenueData = donations.data?? [];
        visitorData = visitors.data?? [];
        bookingData = bookings.data?? [];

        kpi.totalDonations = revenueData.length;
        kpi.totalVisitors = visitorData.length;
        kpi.totalBookings = bookingData.length;
        kpi.totalRevenue = revenueData.reduce((t, d) => t + Number(d.amount || 0), 0);

        buildMonthlyMetrics();
        buildAdvancedAnalytics();

    } catch(err:any){ toast.error(err.message); }
    finally{ loading = false; }
}

// ===== BUILD MONTHLY =====
function buildMonthlyMetrics() {
    monthlyMetrics = months.map(m => ({ month: m, revenue: 0, donations: 0, visitors: 0, bookings: 0 }));

    revenueData.forEach(item => {
        const month = new Date(item.created_at).getMonth();
        monthlyMetrics[month].revenue += Number(item.amount || 0);
        monthlyMetrics[month].donations++;
    });

    visitorData.forEach(item => { monthlyMetrics[new Date(item.created_at).getMonth()].visitors++; });
    bookingData.forEach(item => { monthlyMetrics[new Date(item.created_at).getMonth()].bookings++; });
}

// ===== ADVANCED ANALYTICS =====
function buildAdvancedAnalytics() {
    const donorMap = new Map<string, number>();
    revenueData.forEach(d => {
        const name = d.donor_name?? "Unknown";
        donorMap.set(name, (donorMap.get(name)?? 0) + Number(d.amount?? 0));
    });
    topDonors = [...donorMap.entries()].map(([name, amount]) => ({ name, amount })).sort((a,b)=>b.amount-a.amount).slice(0,10);

    const eventMap = new Map<string, number>();
    bookingData.forEach(b=>{ const name = b.event_name?? "General"; eventMap.set(name, (eventMap.get(name)?? 0)+1); });
    topEvents = [...eventMap.entries()].map(([name,count])=>({ name, count })).sort((a,b)=>b.count-a.count).slice(0,10);
}

// ===== EXPORT =====
function exportAnalyticsCSV(){
    const rows = [["Month","Revenue","Donations","Visitors","Bookings"]];
    monthlyMetrics.forEach(r=>{ rows.push([r.month, String(r.revenue), String(r.donations), String(r.visitors), String(r.bookings)]); });
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`analytics_${selectedYear}.csv`; a.click(); URL.revokeObjectURL(url); toast.success("Report Exported");
}

// ===== AUTO REFRESH =====
let refreshTimer: ReturnType<typeof setInterval>;
onMount(() => { loadAnalytics(); refreshTimer = setInterval(loadAnalytics, 300000); });
onDestroy(() => clearInterval(refreshTimer));

$: selectedYear, selectedMonth, loadAnalytics();
</script>

<div class="page">
    <!-- HEADER -->
    <div class="page-header">
        <div><h1>📊 Analytics Dashboard</h1><p>Enterprise Business Intelligence</p></div>
        <div class="filters">
            <select bind:value={selectedYear}>
                {#each [2024,2025,2026] as y}<option value={y}>{y}</option>{/each}
            </select>
            <select bind:value={selectedMonth}>
                <option>All</option>
                {#each monthNames as m}<option>{m}</option>{/each}
            </select>
        </div>
    </div>

    <!-- KPI CARDS -->
    <div class="dashboard">
        <div class="card green"><h2>₹{kpi.totalRevenue.toLocaleString()}</h2><span>Total Revenue</span></div>
        <div class="card blue"><h2>{kpi.totalDonations}</h2><span>Donations</span></div>
        <div class="card orange"><h2>{kpi.totalVisitors}</h2><span>Visitors</span></div>
        <div class="card purple"><h2>{kpi.totalBookings}</h2><span>Bookings</span></div>
    </div>

    <!-- EXECUTIVE KPI -->
    <div class="card white-card">
        <h2>📈 Executive KPI Dashboard</h2>
        <div class="executive-grid">
            <div class="executive-card"><label>Total Revenue</label><h2>₹{kpi.totalRevenue.toLocaleString()}</h2><small>Overall collections</small></div>
            <div class="executive-card"><label>Total Visitors</label><h2>{kpi.totalVisitors}</h2><small>Temple footfall</small></div>
            <div class="executive-card"><label>Total Donations</label><h2>{kpi.totalDonations}</h2><small>Donation records</small></div>
            <div class="executive-card"><label>Total Bookings</label><h2>{kpi.totalBookings}</h2><small>Hall & event bookings</small></div>
        </div>
    </div>

    <!-- MONTHLY TABLE -->
    <div class="table-card">
        <h2>📈 Monthly Revenue</h2>
        {#if loading}<div class="loading">Loading analytics...</div>
        {:else}
        <table>
            <thead><tr><th>Month</th><th>Revenue</th><th>Donations</th><th>Visitors</th><th>Bookings</th></tr></thead>
            <tbody>
                {#each monthlyMetrics as row}
                <tr><td><strong>{row.month}</strong></td><td>₹{row.revenue.toLocaleString()}</td><td>{row.donations}</td><td>{row.visitors}</td><td>{row.bookings}</td></tr>
                {/each}
            </tbody>
        </table>
        {/if}
    </div>

    <!-- REVENUE CHART -->
    <div class="table-card">
        <h2>📊 Revenue Trend</h2>
        <div class="bar-chart">
            {#each monthlyMetrics as row}
            {@const maxVal = Math.max(...monthlyMetrics.map(m=>m.revenue),1)}
            {@const height = (row.revenue/maxVal)*240}
            <div class="bar-column">
                <div class="bar" style="height:{height}px" title="₹{row.revenue.toLocaleString()}"></div>
                <span>{row.month}</span>
            </div>
            {/each}
        </div>
    </div>

    <!-- VISITOR & BOOKING TREND -->
    <div class="table-card"><h2>👥 Visitor Trend</h2>
        <div class="stats-grid">{#each monthlyMetrics as row}<div class="mini-card"><h3>{row.visitors}</h3><span>{row.month}</span></div>{/each}</div>
    </div>
    <div class="table-card"><h2>📅 Booking Trend</h2>
        <div class="stats-grid">{#each monthlyMetrics as row}<div class="mini-card"><h3>{row.bookings}</h3><span>{row.month}</span></div>{/each}</div>
    </div>

    <!-- TOP DONORS -->
    <div class="table-card"><h2>🏆 Top Donors</h2>
        <table><thead><tr><th>Name</th><th>Total Donation</th></tr></thead><tbody>
            {#each topDonors as donor}<tr><td>{donor.name}</td><td>₹{donor.amount.toLocaleString()}</td></tr>{/each}
        </tbody></table>
    </div>

    <!-- TOP EVENTS -->
    <div class="table-card"><h2>🏛 Most Booked Events</h2>
        <table><thead><tr><th>Event</th><th>Bookings</th></tr></thead><tbody>
            {#each topEvents as event}<tr><td>{event.name}</td><td>{event.count}</td></tr>{/each}
        </tbody></table>
    </div>

    <!-- YEAR COMPARISON -->
    <div class="table-card"><h2>📉 Year Comparison</h2>
        <table><thead><tr><th>Metric</th><th>{selectedYear}</th><th>{selectedYear-1}</th><th>Growth</th></tr></thead><tbody>
            <tr><td>Revenue</td><td>₹{kpi.totalRevenue.toLocaleString()}</td><td>-</td><td>-</td></tr>
            <tr><td>Visitors</td><td>{kpi.totalVisitors}</td><td>-</td><td>-</td></tr>
            <tr><td>Bookings</td><td>{kpi.totalBookings}</td><td>-</td><td>-</td></tr>
        </tbody></table>
    </div>

    <!-- EXPORT -->
    <div class="table-card"><h2>📤 Reports</h2>
        <div class="action-buttons">
            <button class="blue" on:click={exportAnalyticsCSV}>Export CSV</button>
            <button class="orange" on:click={() => window.print()}>Print Dashboard</button>
        </div>
    </div>

    <!-- EXECUTIVE SUMMARY -->
    <div class="card white-card"><h2>📋 Executive Summary</h2>
        <div class="summary-panel">
            <p>Total Revenue: <strong>₹{kpi.totalRevenue.toLocaleString()}</strong></p>
            <p>Donations Recorded: <strong>{kpi.totalDonations}</strong></p>
            <p>Visitor Records: <strong>{kpi.totalVisitors}</strong></p>
            <p>Booking Records: <strong>{kpi.totalBookings}</strong></p>
            <p>Report Generated: <strong>{new Date().toLocaleString()}</strong></p>
        </div>
    </div>

    <footer class="analytics-footer">
        <div>Temple Operations Reporting System</div>
        <div>Enterprise Analytics Dashboard</div>
        <div>Last Refresh <strong>{new Date().toLocaleTimeString()}</strong></div>
    </footer>
</div>

<style>
.page{padding:24px;display:flex;flex-direction:column;gap:20px;max-width:1400px;margin:auto}
.page-header{display:flex;justify-content:space-between;align-items:center;gap:20px}
.filters{display:flex;gap:12px}
.filters select{padding:10px;border:1px solid #d1d5db;border-radius:8px}
.dashboard{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.card{padding:22px;border-radius:12px;color:white;text-align:center}
.card h2{margin:0;font-size:30px}
.green{background:#16a34a}.blue{background:#2563eb}.orange{background:#ea580c}.purple{background:#7c3aed}
.white-card{background:white;color:#111827;box-shadow:0 4px 12px rgba(0,0,0,.08);text-align:left}
.table-card{background:white;padding:20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.08);overflow:auto}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;padding:12px;text-align:left}
td{padding:12px;border-bottom:1px solid #e5e7eb}
.loading{padding:40px;text-align:center;color:#64748b}
.bar-chart{display:flex;align-items:flex-end;gap:18px;height:260px;margin-top:25px;overflow-x:auto}
.bar-column{display:flex;flex-direction:column;align-items:center;flex:1;min-width:60px}
.bar{width:32px;background:#2563eb;border-radius:6px 6px 0 0;transition:.3s}
.bar:hover{opacity:.8;transform:scaleY(1.03)}
.bar-column span{margin-top:10px;font-size:13px}
.stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-top:20px}
.mini-card{background:#f8fafc;padding:16px;border-radius:10px;text-align:center}
.mini-card h3{margin:0;font-size:24px;color:#2563eb}
.mini-card span{display:block;margin-top:6px;font-size:13px;color:#64748b}
.executive-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:20px}
.executive-card{background:#f8fafc;padding:20px;border-radius:10px;text-align:center}
.executive-card label{display:block;font-size:13px;color:#64748b;margin-bottom:8px}
.executive-card h2{margin:0;font-size:30px;color:#2563eb}
.action-buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}
.summary-panel{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:18px}
.summary-panel p{background:#f8fafc;padding:14px;border-radius:8px;margin:0}
.analytics-footer{display:flex;justify-content:space-between;align-items:center;padding:20px;margin-top:30px;border-top:1px solid #e5e7eb;font-size:13px;color:#64748b}
button.blue{background:#2563eb;color:white;border:none;padding:10px 18px;border-radius:8px}button.orange{background:#ea580c;color:white;border:none;padding:10px 18px;border-radius:8px}
@media(max-width:900px){.dashboard,.executive-grid,.stats-grid{grid-template-columns:repeat(2,1fr)}.page-header{flex-direction:column;align-items:flex-start}}
@media(max-width:600px){.dashboard,.executive-grid,.stats-grid{grid-template-columns:1fr}.filters{width:100%;flex-direction:column}.summary-panel{grid-template-columns:1fr}.analytics-footer{flex-direction:column;gap:12px;text-align:center}}
</style>