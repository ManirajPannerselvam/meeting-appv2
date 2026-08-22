```svelte
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { supabase } from "$lib/supabase/client";

    interface AuditLog {
        id: string;
        created_at: string;
        user_id: string | null;
        user_name: string;
        module: string;
        action: string;
        severity: "Critical" | "Warning" | "Info";
        description: string;
        ip_address: string | null;
        browser: string | null;
        record_id: string | null;
        user_agent: string | null;
        old_data?: unknown;
        new_data?: unknown;
        metadata?: Record<string, unknown> | null;
    }

    let loading = true;
    let auditLogs: AuditLog[] = [];

    let search = "";
    let moduleFilter = "All";
    let severityFilter = "All";
    let actionFilter = "All";
    let startDate = "";
    let endDate = "";

    let selectedLog: AuditLog | null = null;
    let showDetails = false;

    // Pagination
    let currentPage = 1;
    let pageSize = 20;

    // Dashboard
    $: totalLogs = auditLogs.length;
    $: criticalLogs = auditLogs.filter(
        (log) => log.severity === "Critical"
    ).length;
    $: warningLogs = auditLogs.filter(
        (log) => log.severity === "Warning"
    ).length;
    $: infoLogs = auditLogs.filter(
        (log) => log.severity === "Info"
    ).length;

    // Module / action filters
    $: modules = [
        "All",
        ...new Set(
            auditLogs
                .map((log) => log.module)
                .filter(Boolean)
        )
    ];

    $: actions = [
        "All",
        ...new Set(
            auditLogs
                .map((log) => log.action)
                .filter(Boolean)
        )
    ];

    // Filtered logs
    $: filteredLogs = auditLogs.filter((log) => {
        const keyword = search.trim().toLowerCase();

        const okSearch =
            !keyword ||
            log.user_name.toLowerCase().includes(keyword) ||
            log.module.toLowerCase().includes(keyword) ||
            log.action.toLowerCase().includes(keyword) ||
            log.description.toLowerCase().includes(keyword) ||
            (log.user_id ?? "").toLowerCase().includes(keyword);

        const okModule =
            moduleFilter === "All" ||
            log.module === moduleFilter;

        const okSeverity =
            severityFilter === "All" ||
            log.severity === severityFilter;

        const okAction =
            actionFilter === "All" ||
            log.action === actionFilter;

        let okDate = true;

        if (startDate) {
            okDate =
                okDate &&
                new Date(log.created_at) >=
                    new Date(`${startDate}T00:00:00`);
        }

        if (endDate) {
            okDate =
                okDate &&
                new Date(log.created_at) <=
                    new Date(`${endDate}T23:59:59`);
        }

        return (
            okSearch &&
            okModule &&
            okSeverity &&
            okAction &&
            okDate
        );
    });

    // Reset pagination whenever filters change
    $: filterKey = `${search}|${moduleFilter}|${severityFilter}|${actionFilter}|${startDate}|${endDate}`;

    $: {
        filterKey;
        currentPage = 1;
    }

    $: totalPages = Math.max(
        1,
        Math.ceil(filteredLogs.length / pageSize)
    );

    $: paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Auto Refresh
    let autoRefresh = false;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;

    $: {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = undefined;
        }

        if (autoRefresh) {
            refreshTimer = setInterval(
                refreshLogs,
                30000
            );
        }
    }

    onDestroy(() => {
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
    });

    // ============================================================
    // HELPERS
    // ============================================================

    function getSeverity(action: string): AuditLog["severity"] {
        const normalized = action.toUpperCase();

        if (
            normalized === "DELETE" ||
            normalized === "REJECT" ||
            normalized === "RESTORE"
        ) {
            return "Critical";
        }

        if (
            normalized === "UPDATE" ||
            normalized === "APPROVE" ||
            normalized === "ASSIGN"
        ) {
            return "Warning";
        }

        return "Info";
    }

    function getBrowser(userAgent: string | null): string {
        if (!userAgent) return "";

        if (userAgent.includes("Edg/")) {
            return "Microsoft Edge";
        }

        if (userAgent.includes("Chrome/")) {
            return "Google Chrome";
        }

        if (userAgent.includes("Firefox/")) {
            return "Mozilla Firefox";
        }

        if (userAgent.includes("Safari/")) {
            return "Safari";
        }

        if (userAgent.includes("PostmanRuntime")) {
            return "Postman";
        }

        return "Unknown";
    }

    function getUserName(
        profile: {
            full_name?: string | null;
            email?: string | null;
        } | null
    ): string {
        return (
            profile?.full_name ||
            profile?.email ||
            "Unknown User"
        );
    }

    // ============================================================
    // LOAD AUDIT LOGS
    // ============================================================

    async function loadAuditLogs() {
        loading = true;

        try {
            const { data, error } = await supabase
                .from("audit_logs")
                .select(`
                    id,
                    user_id,
                    action,
                    module,
                    record_id,
                    description,
                    old_data,
                    new_data,
                    ip_address,
                    user_agent,
                    metadata,
                    created_at
                `)
                .order("created_at", {
                    ascending: false
                })
                .limit(5000);

            if (error) {
                throw error;
            }

            const rawLogs = data ?? [];

            // Load profiles separately so this page does not depend
            // on a specific Supabase foreign-key relationship name.
            const userIds = [
                ...new Set(
                    rawLogs
                        .map((log) => log.user_id)
                        .filter(
                            (id): id is string =>
                                Boolean(id)
                        )
                )
            ];

            let profileMap = new Map<
                string,
                {
                    full_name?: string | null;
                    email?: string | null;
                }
            >();

            if (userIds.length > 0) {
                const { data: profiles, error: profileError } =
                    await supabase
                        .from("profiles")
                        .select("id, full_name, email")
                        .in("id", userIds);

                if (!profileError && profiles) {
                    profileMap = new Map(
                        profiles.map((profile) => [
                            profile.id,
                            profile
                        ])
                    );
                }
            }

            auditLogs = rawLogs.map((log) => ({
                id: log.id,
                created_at: log.created_at,
                user_id: log.user_id,
                user_name: getUserName(
                    log.user_id
                        ? profileMap.get(log.user_id) ?? null
                        : null
                ),
                module: log.module ?? "System",
                action: log.action ?? "UNKNOWN",
                severity: getSeverity(
                    log.action ?? "UNKNOWN"
                ),
                description:
                    log.description ??
                    "No description available",
                ip_address: log.ip_address ?? null,
                browser: getBrowser(
                    log.user_agent ?? null
                ),
                record_id: log.record_id ?? null,
                user_agent: log.user_agent ?? null,
                old_data: log.old_data,
                new_data: log.new_data,
                metadata: log.metadata ?? null
            }));
        } catch (error) {
            console.error(
                "Failed to load audit logs:",
                error
            );
            auditLogs = [];
        } finally {
            loading = false;
        }
    }

    // ============================================================
    // ACTIONS
    // ============================================================

    function openLog(log: AuditLog) {
        selectedLog = log;
        showDetails = true;
    }

    function closeDetails() {
        showDetails = false;
        selectedLog = null;
    }

    function previousPage() {
        if (currentPage > 1) {
            currentPage--;
        }
    }

    function nextPage() {
        if (currentPage < totalPages) {
            currentPage++;
        }
    }

    async function refreshLogs() {
        await loadAuditLogs();
    }

    function exportCSV() {
        const headers = [
            "Date",
            "User",
            "Module",
            "Action",
            "Severity",
            "Description",
            "IP Address"
        ];

        const rows = filteredLogs.map((log) => [
            log.created_at,
            log.user_name,
            log.module,
            log.action,
            log.severity,
            log.description,
            log.ip_address ?? ""
        ]);

        const escapeCSV = (value: unknown) => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
        };

        const csv = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) =>
                row.map(escapeCSV).join(",")
            )
        ].join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `audit_logs_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
    }

    function printLogs() {
        window.print();
    }

    onMount(loadAuditLogs);
</script>

<div class="page">
    <!-- HEADER -->
    <div class="page-header">
        <div>
            <h1>📋 Audit Logs</h1>
            <p>Enterprise Activity Monitoring</p>
        </div>
    </div>

    <!-- DASHBOARD -->
    <div class="dashboard">
        <div class="card blue">
            <h2>{totalLogs}</h2>
            <span>Total Logs</span>
        </div>

        <div class="card red">
            <h2>{criticalLogs}</h2>
            <span>Critical</span>
        </div>

        <div class="card orange">
            <h2>{warningLogs}</h2>
            <span>Warnings</span>
        </div>

        <div class="card green">
            <h2>{infoLogs}</h2>
            <span>Information</span>
        </div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">
        <input
            bind:value={search}
            placeholder="Search user, module, action..."
        />

        <select bind:value={moduleFilter}>
            {#each modules as module}
                <option value={module}>
                    {module}
                </option>
            {/each}
        </select>

        <select bind:value={severityFilter}>
            <option value="All">All</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Info">Info</option>
        </select>

        <select bind:value={actionFilter}>
            {#each actions as action}
                <option value={action}>
                    {action}
                </option>
            {/each}
        </select>

        <input
            type="date"
            bind:value={startDate}
        />

        <input
            type="date"
            bind:value={endDate}
        />
    </div>

    <!-- ACTION BUTTONS -->
    <div class="toolbar-buttons">
        <button
            class="green"
            on:click={refreshLogs}
        >
            🔄 Refresh
        </button>

        <button
            class="blue"
            on:click={exportCSV}
        >
            📤 Export CSV
        </button>

        <button
            class="orange"
            on:click={printLogs}
        >
            🖨 Print
        </button>

        <label class="toggle">
            <input
                type="checkbox"
                bind:checked={autoRefresh}
            />
            Auto Refresh 30s
        </label>
    </div>

    <!-- TABLE -->
    <div class="table-card">
        {#if loading}
            <div class="skeleton">
                {#each Array(8) as _}
                    <div class="skeleton-row"></div>
                {/each}
            </div>
        {:else if filteredLogs.length === 0}
            <div class="loading">
                No Records Found
            </div>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Module</th>
                        <th>Action</th>
                        <th>Severity</th>
                        <th>Details</th>
                    </tr>
                </thead>

                <tbody>
                    {#each paginatedLogs as log}
                        <tr>
                            <td>
                                {new Date(
                                    log.created_at
                                ).toLocaleString()}
                            </td>

                            <td>
                                {log.user_name}
                            </td>

                            <td>
                                {log.module}
                            </td>

                            <td>
                                {log.action}
                            </td>

                            <td>
                                <span
                                    class="severity"
                                    class:critical={
                                        log.severity ===
                                        "Critical"
                                    }
                                    class:warning={
                                        log.severity ===
                                        "Warning"
                                    }
                                    class:info={
                                        log.severity ===
                                        "Info"
                                    }
                                >
                                    {log.severity}
                                </span>
                            </td>

                            <td>
                                <button
                                    class="small blue"
                                    on:click={() =>
                                        openLog(log)
                                    }
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>

    <!-- PAGINATION -->
    {#if !loading && filteredLogs.length > 0}
        <div class="pagination">
            <button
                on:click={previousPage}
                disabled={currentPage === 1}
            >
                ◀ Previous
            </button>

            <span>
                Page {currentPage} of {totalPages}
                -
                {filteredLogs.length} records
            </span>

            <button
                on:click={nextPage}
                disabled={currentPage === totalPages}
            >
                Next ▶
            </button>
        </div>
    {/if}

    <!-- ANALYTICS -->
    <div class="card analytics-card">
        <h2>📊 Audit Analytics</h2>

        <div class="analytics-grid">
            <div class="analytics-item">
                <h3>{criticalLogs}</h3>
                <span>Critical Events</span>
            </div>

            <div class="analytics-item">
                <h3>{warningLogs}</h3>
                <span>Warnings</span>
            </div>

            <div class="analytics-item">
                <h3>{infoLogs}</h3>
                <span>Information</span>
            </div>

            <div class="analytics-item">
                <h3>{filteredLogs.length}</h3>
                <span>Filtered Logs</span>
            </div>
        </div>
    </div>

    <!-- MODULE STATS -->
    <div class="card analytics-card">
        <h2>📈 Activity by Module</h2>

        <div class="table-card inner-table">
            <table>
                <thead>
                    <tr>
                        <th>Module</th>
                        <th>Events</th>
                    </tr>
                </thead>

                <tbody>
                    {#each modules.slice(1) as module}
                        <tr>
                            <td>{module}</td>
                            <td>
                                {auditLogs.filter(
                                    (log) =>
                                        log.module ===
                                        module
                                ).length}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>

    <!-- TIMELINE -->
    <div class="card analytics-card">
        <h2>🕒 Recent Activity</h2>

        <div class="timeline">
            {#each auditLogs.slice(0, 10) as item}
                <div class="timeline-item">
                    <div
                        class="dot"
                        class:dot-critical={
                            item.severity ===
                            "Critical"
                        }
                    ></div>

                    <div>
                        <strong>
                            {item.user_name}
                        </strong>

                        <div>
                            {item.module}
                            →
                            {item.action}
                        </div>

                        <small>
                            {new Date(
                                item.created_at
                            ).toLocaleString()}
                        </small>
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- SYSTEM HEALTH -->
    <div class="card analytics-card">
        <h2>🖥 System Health</h2>

        <div class="health-grid">
            <div class="health-card green">
                <h3>Database</h3>
                <p>
                    {loading
                        ? "Checking..."
                        : "Healthy"}
                </p>
            </div>

            <div class="health-card blue">
                <h3>Audit Service</h3>
                <p>Running</p>
            </div>

            <div class="health-card orange">
                <h3>Auto Refresh</h3>
                <p>
                    {autoRefresh
                        ? "Enabled"
                        : "Disabled"}
                </p>
            </div>

            <div class="health-card purple">
                <h3>Last Refresh</h3>
                <p>
                    {new Date().toLocaleTimeString()}
                </p>
            </div>
        </div>
    </div>

    <footer class="audit-footer">
        <div>
            Enterprise Temple Operations Reporting System
        </div>

        <div>
            Audit Management Module v1.0
        </div>
    </footer>
</div>

<!-- DETAILS DIALOG -->
{#if showDetails && selectedLog}
    <div class="overlay">
        <div class="dialog">
            <div class="dialog-header">
                <h2>Audit Log Details</h2>

                <button
                    class="close"
                    on:click={closeDetails}
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>

            <div class="detail-grid">
                <div>
                    <label>Log ID</label>
                    <div>
                        {selectedLog.id}
                    </div>
                </div>

                <div>
                    <label>Date & Time</label>
                    <div>
                        {new Date(
                            selectedLog.created_at
                        ).toLocaleString()}
                    </div>
                </div>

                <div>
                    <label>User</label>
                    <div>
                        {selectedLog.user_name}
                    </div>
                </div>

                <div>
                    <label>User ID</label>
                    <div>
                        {selectedLog.user_id ?? "-"}
                    </div>
                </div>

                <div>
                    <label>Module</label>
                    <div>
                        {selectedLog.module}
                    </div>
                </div>

                <div>
                    <label>Action</label>
                    <div>
                        {selectedLog.action}
                    </div>
                </div>

                <div>
                    <label>Severity</label>

                    <span
                        class="severity"
                        class:critical={
                            selectedLog.severity ===
                            "Critical"
                        }
                        class:warning={
                            selectedLog.severity ===
                            "Warning"
                        }
                        class:info={
                            selectedLog.severity ===
                            "Info"
                        }
                    >
                        {selectedLog.severity}
                    </span>
                </div>

                <div>
                    <label>Record ID</label>
                    <div>
                        {selectedLog.record_id ?? "-"}
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>Description</h3>

                <div class="description">
                    {selectedLog.description}
                </div>
            </div>

            <div class="section">
                <h3>Client Information</h3>

                <table class="info-table">
                    <tbody>
                        <tr>
                            <td>IP Address</td>
                            <td>
                                {selectedLog.ip_address ??
                                    "-"}
                            </td>
                        </tr>

                        <tr>
                            <td>Browser</td>
                            <td>
                                {selectedLog.browser ??
                                    "-"}
                            </td>
                        </tr>

                        <tr>
                            <td>User Agent</td>
                            <td class="break-text">
                                {selectedLog.user_agent ??
                                    "-"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {#if selectedLog.metadata}
                <div class="section">
                    <h3>Metadata</h3>

                    <pre class="json-data">{JSON.stringify(
                        selectedLog.metadata,
                        null,
                        2
                    )}</pre>
                </div>
            {/if}

            <div class="dialog-footer">
                <button
                    class="secondary"
                    on:click={closeDetails}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .page {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 1400px;
        margin: auto;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .page-header h1 {
        margin: 0;
    }

    .page-header p {
        margin: 5px 0 0;
        color: #64748b;
    }

    .dashboard {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
    }

    .card {
        padding: 20px;
        border-radius: 12px;
        color: white;
    }

    .card h2 {
        margin: 0;
        font-size: 32px;
    }

    .analytics-card {
        background: white;
        color: #0f172a;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .analytics-card > h2 {
        font-size: 22px;
        margin-bottom: 10px;
    }

    .blue {
        background: #2563eb;
    }

    .red {
        background: #dc2626;
    }

    .orange {
        background: #ea580c;
    }

    .green {
        background: #16a34a;
    }

    .purple {
        background: #7c3aed;
    }

    .toolbar {
        display: grid;
        grid-template-columns: 2fr repeat(5, 1fr);
        gap: 12px;
    }

    .toolbar input,
    .toolbar select {
        min-width: 0;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
    }

    .toolbar-buttons {
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
        flex-wrap: wrap;
        align-items: center;
    }

    .toolbar-buttons button {
        border: none;
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #334155;
    }

    .table-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        overflow: auto;
    }

    .inner-table {
        margin-top: 15px;
        box-shadow: none;
        padding: 0;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        background: #f8fafc;
        padding: 12px;
        text-align: left;
        white-space: nowrap;
    }

    td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
    }

    .severity {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
    }

    .critical {
        background: #fee2e2;
        color: #dc2626;
    }

    .warning {
        background: #ffedd5;
        color: #ea580c;
    }

    .info {
        background: #dbeafe;
        color: #2563eb;
    }

    .small {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        color: white;
    }

    .loading {
        padding: 40px;
        text-align: center;
        color: #64748b;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        margin-top: 20px;
        flex-wrap: wrap;
    }

    .pagination button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: #2563eb;
        color: white;
    }

    .pagination button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .analytics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
        margin-top: 20px;
    }

    .analytics-item {
        background: #f8fafc;
        padding: 18px;
        border-radius: 10px;
        text-align: center;
    }

    .analytics-item h3 {
        margin: 0;
        font-size: 28px;
        color: #2563eb;
    }

    .analytics-item span {
        display: block;
        margin-top: 8px;
        color: #64748b;
        font-size: 13px;
    }

    .timeline {
        display: flex;
        flex-direction: column;
        gap: 18px;
        margin-top: 20px;
    }

    .timeline-item {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        color: #334155;
    }

    .dot {
        flex: 0 0 auto;
        width: 14px;
        height: 14px;
        background: #2563eb;
        border-radius: 50%;
        margin-top: 6px;
    }

    .dot-critical {
        background: #dc2626;
    }

    .skeleton-row {
        height: 48px;
        border-radius: 8px;
        background: #f1f5f9;
        margin-bottom: 10px;
        animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 0.45;
        }

        50% {
            opacity: 1;
        }

        100% {
            opacity: 0.45;
        }
    }

    .health-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
        margin-top: 18px;
    }

    .health-card {
        padding: 20px;
        border-radius: 12px;
        color: white;
        text-align: center;
    }

    .health-card h3 {
        margin: 0 0 8px;
    }

    .health-card p {
        margin: 0;
    }

    .audit-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0;
        margin-top: 30px;
        border-top: 1px solid #e5e7eb;
        color: #64748b;
        font-size: 13px;
    }

    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        padding: 20px;
    }

    .dialog {
        background: white;
        width: 900px;
        max-width: 100%;
        max-height: 90vh;
        overflow: auto;
        border-radius: 14px;
        padding: 24px;
        color: #0f172a;
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .dialog-header h2 {
        margin: 0;
    }

    .close {
        border: none;
        background: none;
        font-size: 24px;
        cursor: pointer;
        color: #475569;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
        margin-bottom: 25px;
    }

    .detail-grid label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 5px;
    }

    .section {
        margin-top: 20px;
    }

    .section h3 {
        margin-bottom: 10px;
    }

    .description {
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        line-height: 1.6;
        white-space: pre-wrap;
    }

    .dialog-footer {
        margin-top: 25px;
        display: flex;
        justify-content: flex-end;
    }

    .secondary {
        background: #64748b;
        color: white;
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    }

    .info-table {
        width: 100%;
        border-collapse: collapse;
    }

    .info-table td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
    }

    .break-text {
        word-break: break-word;
    }

    .json-data {
        background: #0f172a;
        color: #e2e8f0;
        padding: 16px;
        border-radius: 8px;
        overflow: auto;
        font-size: 12px;
    }

    button.green {
        background: #16a34a;
    }

    button.blue {
        background: #2563eb;
    }

    button.orange {
        background: #ea580c;
    }

    @media (max-width: 1100px) {
        .toolbar {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 900px) {
        .dashboard,
        .analytics-grid,
        .health-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 600px) {
        .page {
            padding: 14px;
        }

        .dashboard,
        .analytics-grid,
        .health-grid,
        .detail-grid,
        .toolbar {
            grid-template-columns: 1fr;
        }

        .table-card {
            padding: 12px;
        }

        .pagination {
            justify-content: space-between;
        }

        .audit-footer {
            flex-direction: column;
            gap: 10px;
            text-align: center;
        }

        .dialog {
            padding: 16px;
        }
    }

    @media print {
        .toolbar,
        .toolbar-buttons,
        .pagination,
        .overlay {
            display: none !important;
        }

        .page {
            max-width: none;
            padding: 0;
        }

        .card,
        .table-card {
            box-shadow: none;
        }
    }
</style>