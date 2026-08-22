```svelte
<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase/client";
    import { toast } from "svelte-sonner";

    interface WorkflowRequest {
        workflow_id: string;
        reference_type: string;
        reference_id: string;
        title: string;
        submitted_by: string;
        assigned_to: string | null;
        status: "Draft" | "Pending" | "Approved" | "Rejected";
        priority: "Low" | "Medium" | "High";
        comments: string | null;
        created_at: string;
        updated_at: string;
    }

    interface WorkflowActivity {
        activity_id: string;
        workflow_id: string;
        action: string;
        performed_by: string;
        remarks: string | null;
        created_at: string;
    }

    let loading = true;
    let actionLoading = false;

    let workflows: WorkflowRequest[] = [];
    let filteredWorkflows: WorkflowRequest[] = [];
    let activities: WorkflowActivity[] = [];
    let users: string[] = [];

    let search = "";
    let statusFilter = "All";
    let priorityFilter = "All";

    let selectedWorkflow: WorkflowRequest | null = null;
    let showDetailsDialog = false;

    let reviewComment = "";
    let assignedReviewer = "";

    // =========================
    // PAGINATION
    // =========================
    let currentPage = 1;
    let pageSize = 20;

    $: totalPages = Math.max(
        1,
        Math.ceil(filteredWorkflows.length / pageSize)
    );

    $: paginatedWorkflows = filteredWorkflows.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // =========================
    // DASHBOARD
    // =========================
    $: totalRequests = workflows.length;

    $: pendingRequests = workflows.filter(
        (workflow) => workflow.status === "Pending"
    ).length;

    $: approvedRequests = workflows.filter(
        (workflow) => workflow.status === "Approved"
    ).length;

    $: rejectedRequests = workflows.filter(
        (workflow) => workflow.status === "Rejected"
    ).length;

    $: draftRequests = workflows.filter(
        (workflow) => workflow.status === "Draft"
    ).length;

    $: highPriorityRequests = workflows.filter(
        (workflow) => workflow.priority === "High"
    ).length;

    $: assignedRequests = workflows.filter(
        (workflow) => Boolean(workflow.assigned_to)
    ).length;

    $: unassignedRequests = workflows.filter(
        (workflow) => !workflow.assigned_to
    ).length;

    // =========================
    // LOAD WORKFLOWS
    // =========================
    async function loadWorkflows() {
        loading = true;

        try {
            const { data, error } = await supabase
                .from("workflow_requests")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            workflows = (data ?? []) as WorkflowRequest[];

            await loadUsers();
            applyFilters();
        } catch (err: any) {
            console.error("Workflow load error:", err);
            toast.error(err?.message ?? "Failed to load workflows.");
        } finally {
            loading = false;
        }
    }

    // =========================
    // LOAD USERS
    // =========================
    async function loadUsers() {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("full_name")
                .not("full_name", "is", null)
                .order("full_name", { ascending: true });

            if (error) throw error;

            users = [
                ...new Set(
                    (data ?? [])
                        .map((user) => user.full_name?.trim())
                        .filter(Boolean)
                )
            ];
        } catch (err: any) {
            console.error("User load error:", err);
            users = [];
        }
    }

    // =========================
    // FILTERS
    // =========================
    function applyFilters() {
        const normalizedSearch = search.trim().toLowerCase();

        filteredWorkflows = workflows.filter((workflow) => {
            const matchSearch =
                !normalizedSearch ||
                workflow.title.toLowerCase().includes(normalizedSearch) ||
                workflow.reference_type
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                workflow.reference_id
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                workflow.submitted_by
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                (workflow.assigned_to ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchStatus =
                statusFilter === "All" ||
                workflow.status === statusFilter;

            const matchPriority =
                priorityFilter === "All" ||
                workflow.priority === priorityFilter;

            return matchSearch && matchStatus && matchPriority;
        });

        currentPage = 1;
    }

    $: search, statusFilter, priorityFilter, workflows, applyFilters();

    // =========================
    // OPEN WORKFLOW
    // =========================
    async function openWorkflow(workflow: WorkflowRequest) {
        selectedWorkflow = { ...workflow };

        reviewComment = workflow.comments ?? "";
        assignedReviewer = workflow.assigned_to ?? "";

        activities = [];
        showDetailsDialog = true;

        await loadWorkflowActivity(workflow.workflow_id);
    }

    // =========================
    // LOAD ACTIVITY
    // =========================
    async function loadWorkflowActivity(workflowId: string) {
        try {
            const { data, error } = await supabase
                .from("workflow_activity")
                .select("*")
                .eq("workflow_id", workflowId)
                .order("created_at", { ascending: true });

            if (error) throw error;

            activities = (data ?? []) as WorkflowActivity[];
        } catch (err: any) {
            console.error("Activity load error:", err);
            activities = [];
            toast.error("Unable to load workflow activity.");
        }
    }

    // =========================
    // ASSIGN REVIEWER
    // =========================
    async function assignReviewer() {
        if (!selectedWorkflow) return;

        if (!assignedReviewer.trim()) {
            toast.error("Please select a reviewer.");
            return;
        }

        actionLoading = true;

        try {
            const { error } = await supabase
                .from("workflow_requests")
                .update({
                    assigned_to: assignedReviewer,
                    updated_at: new Date().toISOString()
                })
                .eq(
                    "workflow_id",
                    selectedWorkflow.workflow_id
                );

            if (error) throw error;

            selectedWorkflow = {
                ...selectedWorkflow,
                assigned_to: assignedReviewer
            };

            await logActivity(
                "Assigned",
                `Assigned to ${assignedReviewer}`
            );

            toast.success("Reviewer Assigned");

            await loadWorkflows();
            await loadWorkflowActivity(
                selectedWorkflow.workflow_id
            );
        } catch (err: any) {
            console.error("Assign reviewer error:", err);
            toast.error(
                err?.message ?? "Failed to assign reviewer."
            );
        } finally {
            actionLoading = false;
        }
    }

    // =========================
    // APPROVE WORKFLOW
    // =========================
    async function approveWorkflow() {
        if (!selectedWorkflow) return;

        actionLoading = true;

        const workflowId = selectedWorkflow.workflow_id;
        const comment = reviewComment.trim();

        try {
            const { error } = await supabase
                .from("workflow_requests")
                .update({
                    status: "Approved",
                    comments: comment || null,
                    updated_at: new Date().toISOString()
                })
                .eq("workflow_id", workflowId);

            if (error) throw error;

            await logActivity(
                "Approved",
                comment || "Workflow approved."
            );

            await notifyWorkflowStatus(
                workflowId,
                "Approved"
            );

            toast.success("Workflow Approved");

            showDetailsDialog = false;
            selectedWorkflow = null;
            activities = [];

            await loadWorkflows();
        } catch (err: any) {
            console.error("Approve workflow error:", err);
            toast.error(
                err?.message ?? "Failed to approve workflow."
            );
        } finally {
            actionLoading = false;
        }
    }

    // =========================
    // REJECT WORKFLOW
    // =========================
    async function rejectWorkflow() {
        if (!selectedWorkflow) return;

        const comment = reviewComment.trim();

        if (!comment) {
            toast.error(
                "Please enter rejection comments."
            );
            return;
        }

        actionLoading = true;

        const workflowId = selectedWorkflow.workflow_id;

        try {
            const { error } = await supabase
                .from("workflow_requests")
                .update({
                    status: "Rejected",
                    comments: comment,
                    updated_at: new Date().toISOString()
                })
                .eq("workflow_id", workflowId);

            if (error) throw error;

            await logActivity(
                "Rejected",
                comment
            );

            await notifyWorkflowStatus(
                workflowId,
                "Rejected"
            );

            toast.success("Workflow Rejected");

            showDetailsDialog = false;
            selectedWorkflow = null;
            activities = [];

            await loadWorkflows();
        } catch (err: any) {
            console.error("Reject workflow error:", err);
            toast.error(
                err?.message ?? "Failed to reject workflow."
            );
        } finally {
            actionLoading = false;
        }
    }

    // =========================
    // LOG ACTIVITY
    // =========================
    async function logActivity(
        action: string,
        remarks: string
    ) {
        if (!selectedWorkflow) return;

        try {
            const { error } = await supabase
                .from("workflow_activity")
                .insert({
                    workflow_id:
                        selectedWorkflow.workflow_id,
                    action,
                    performed_by: "Admin",
                    remarks: remarks || null
                });

            if (error) {
                console.error(
                    "Activity insert error:",
                    error
                );
            }
        } catch (err) {
            console.error(
                "Activity logging failed:",
                err
            );
        }
    }

    // =========================
    // NOTIFICATION
    // =========================
    async function notifyWorkflowStatus(
        workflowId: string,
        status: WorkflowRequest["status"]
    ) {
        console.log(
            "Workflow Notification:",
            workflowId,
            status
        );

        /*
         * Production implementation:
         *
         * const { error } = await supabase.functions.invoke(
         *     "workflow-notification",
         *     {
         *         body: {
         *             workflow_id: workflowId,
         *             status
         *         }
         *     }
         * );
         *
         * if (error) {
         *     console.error(error);
         * }
         */
    }

    // =========================
    // CSV ESCAPE
    // =========================
    function csvEscape(value: unknown): string {
        const text = String(value ?? "");

        if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n") ||
            text.includes("\r")
        ) {
            return `"${text.replace(/"/g, '""')}"`;
        }

        return text;
    }

    // =========================
    // EXPORT CSV
    // =========================
    function exportWorkflowCSV() {
        const rows: string[][] = [
            [
                "Workflow ID",
                "Title",
                "Reference Type",
                "Reference ID",
                "Status",
                "Priority",
                "Reviewer",
                "Submitted By",
                "Comments",
                "Created",
                "Updated"
            ]
        ];

        filteredWorkflows.forEach((workflow) => {
            rows.push([
                workflow.workflow_id,
                workflow.title,
                workflow.reference_type,
                workflow.reference_id,
                workflow.status,
                workflow.priority,
                workflow.assigned_to ?? "",
                workflow.submitted_by,
                workflow.comments ?? "",
                workflow.created_at,
                workflow.updated_at
            ]);
        });

        const csv = rows
            .map((row) =>
                row.map(csvEscape).join(",")
            )
            .join("\r\n");

        const blob = new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `workflow_report_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);

        toast.success("Workflow Report Exported");
    }

    // =========================
    // PAGINATION
    // =========================
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

    function closeDialog() {
        if (actionLoading) return;

        showDetailsDialog = false;
        selectedWorkflow = null;
        activities = [];
        reviewComment = "";
        assignedReviewer = "";
    }

    // =========================
    // INITIAL LOAD
    // =========================
    onMount(() => {
        loadWorkflows();
    });
</script>

<div class="page">

    <!-- HEADER -->
    <div class="page-header">
        <div>
            <h1>✅ Workflow Approval Center</h1>
            <p>Enterprise Approval Management</p>
        </div>

        <button
            class="blue refresh-button"
            on:click={loadWorkflows}
            disabled={loading}
        >
            {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
    </div>

    <!-- DASHBOARD -->
    <div class="dashboard">

        <div class="card blue">
            <span>Total Requests</span>
            <h2>{totalRequests}</h2>
        </div>

        <div class="card orange">
            <span>Pending</span>
            <h2>{pendingRequests}</h2>
        </div>

        <div class="card green">
            <span>Approved</span>
            <h2>{approvedRequests}</h2>
        </div>

        <div class="card red">
            <span>Rejected</span>
            <h2>{rejectedRequests}</h2>
        </div>

    </div>

    <!-- FILTERS -->
    <div class="toolbar">

        <input
            bind:value={search}
            placeholder="Search title, reference, reviewer..."
            aria-label="Search workflows"
        />

        <select
            bind:value={statusFilter}
            aria-label="Filter by status"
        >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
        </select>

        <select
            bind:value={priorityFilter}
            aria-label="Filter by priority"
        >
            <option value="All">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
        </select>

    </div>

    <!-- WORKFLOW TABLE -->
    <div class="table-card">

        <div class="section-header">
            <div>
                <h2>Workflow Requests</h2>
                <span>
                    {filteredWorkflows.length} request(s)
                </span>
            </div>

            <button
                class="orange export-button"
                on:click={exportWorkflowCSV}
                disabled={filteredWorkflows.length === 0}
            >
                📤 Export CSV
            </button>
        </div>

        {#if loading}

            <div class="skeleton">
                {#each Array(7) as _}
                    <div class="skeleton-row"></div>
                {/each}
            </div>

        {:else if filteredWorkflows.length === 0}

            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No workflow requests found</h3>
                <p>
                    Try changing the search or filter options.
                </p>
            </div>

        {:else}

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Reference</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Submitted By</th>
                            <th>Reviewer</th>
                            <th>Created</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {#each paginatedWorkflows as workflow}
                            <tr>

                                <td>
                                    <strong>
                                        {workflow.title}
                                    </strong>

                                    {#if workflow.comments}
                                        <small class="comment-preview">
                                            {workflow.comments}
                                        </small>
                                    {/if}
                                </td>

                                <td>
                                    <div class="reference-cell">
                                        <strong>
                                            {workflow.reference_type}
                                        </strong>
                                        <small>
                                            {workflow.reference_id}
                                        </small>
                                    </div>
                                </td>

                                <td>
                                    <span
                                        class="priority"
                                        class:high={workflow.priority === "High"}
                                        class:medium={workflow.priority === "Medium"}
                                        class:low={workflow.priority === "Low"}
                                    >
                                        {workflow.priority}
                                    </span>
                                </td>

                                <td>
                                    <span
                                        class="status"
                                        class:pending={workflow.status === "Pending"}
                                        class:approved={workflow.status === "Approved"}
                                        class:rejected={workflow.status === "Rejected"}
                                        class:draft={workflow.status === "Draft"}
                                    >
                                        {workflow.status}
                                    </span>
                                </td>

                                <td>
                                    {workflow.submitted_by}
                                </td>

                                <td>
                                    {workflow.assigned_to ?? "Unassigned"}
                                </td>

                                <td>
                                    {new Date(
                                        workflow.created_at
                                    ).toLocaleDateString()}
                                </td>

                                <td>
                                    <button
                                        class="small blue"
                                        on:click={() =>
                                            openWorkflow(workflow)
                                        }
                                    >
                                        Review
                                    </button>
                                </td>

                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

        {/if}

    </div>

    <!-- PAGINATION -->
    {#if !loading && filteredWorkflows.length > 0}

        <div class="pagination">

            <button
                on:click={previousPage}
                disabled={currentPage === 1}
            >
                ◀ Previous
            </button>

            <span>
                Page {currentPage} of {totalPages}
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
    <div class="card white-card">

        <h2>📊 Workflow Analytics</h2>

        <div class="analytics-grid">

            <div class="analytics-item">
                <h3>{totalRequests}</h3>
                <span>Total Requests</span>
            </div>

            <div class="analytics-item">
                <h3>{draftRequests}</h3>
                <span>Draft</span>
            </div>

            <div class="analytics-item">
                <h3>{pendingRequests}</h3>
                <span>Pending</span>
            </div>

            <div class="analytics-item">
                <h3>{approvedRequests}</h3>
                <span>Approved</span>
            </div>

            <div class="analytics-item">
                <h3>{rejectedRequests}</h3>
                <span>Rejected</span>
            </div>

        </div>

    </div>

    <!-- REVIEWER PERFORMANCE -->
    <div class="card white-card">

        <h2>👤 Reviewer Performance</h2>

        {#if workflows.length === 0}

            <div class="empty-state compact">
                No reviewer data available.
            </div>

        {:else}

            <div class="table-wrapper">
                <table class="status-table">
                    <thead>
                        <tr>
                            <th>Reviewer</th>
                            <th>Assigned</th>
                            <th>Pending</th>
                            <th>Approved</th>
                            <th>Rejected</th>
                        </tr>
                    </thead>

                    <tbody>

                        {#each [
                            ...new Set(
                                workflows
                                    .map((workflow) => workflow.assigned_to)
                                    .filter(Boolean)
                            )
                        ] as reviewer}

                            <tr>

                                <td>
                                    <strong>{reviewer}</strong>
                                </td>

                                <td>
                                    {
                                        workflows.filter(
                                            (workflow) =>
                                                workflow.assigned_to === reviewer
                                        ).length
                                    }
                                </td>

                                <td>
                                    {
                                        workflows.filter(
                                            (workflow) =>
                                                workflow.assigned_to === reviewer &&
                                                workflow.status === "Pending"
                                        ).length
                                    }
                                </td>

                                <td>
                                    {
                                        workflows.filter(
                                            (workflow) =>
                                                workflow.assigned_to === reviewer &&
                                                workflow.status === "Approved"
                                        ).length
                                    }
                                </td>

                                <td>
                                    {
                                        workflows.filter(
                                            (workflow) =>
                                                workflow.assigned_to === reviewer &&
                                                workflow.status === "Rejected"
                                        ).length
                                    }
                                </td>

                            </tr>

                        {/each}

                    </tbody>
                </table>
            </div>

        {/if}

    </div>

    <!-- QUEUE SUMMARY -->
    <div class="card white-card">

        <h2>📋 Queue Summary</h2>

        <div class="summary-grid">

            <div class="summary-item">
                <label>Total Queue</label>
                <h3>{pendingRequests}</h3>
            </div>

            <div class="summary-item">
                <label>High Priority</label>
                <h3>{highPriorityRequests}</h3>
            </div>

            <div class="summary-item">
                <label>Assigned</label>
                <h3>{assignedRequests}</h3>
            </div>

            <div class="summary-item">
                <label>Unassigned</label>
                <h3>{unassignedRequests}</h3>
            </div>

        </div>

    </div>

    <!-- REPORTS -->
    <div class="card white-card">

        <h2>📤 Reports</h2>

        <div class="action-buttons">

            <button
                class="blue"
                on:click={exportWorkflowCSV}
                disabled={filteredWorkflows.length === 0}
            >
                Export CSV
            </button>

            <button
                class="orange"
                on:click={() => window.print()}
            >
                Print Report
            </button>

        </div>

    </div>

    <!-- LIVE STATUS -->
    <div class="card white-card">

        <h2>🟢 Live Workflow Status</h2>

        <div class="live-grid">

            <div class="live-item">
                <h3>Workflow Engine</h3>
                <span class="badge success">
                    Online
                </span>
            </div>

            <div class="live-item">
                <h3>Approval Queue</h3>
                <span class="badge warning">
                    {pendingRequests} Pending
                </span>
            </div>

            <div class="live-item">
                <h3>Approved Requests</h3>
                <span class="badge success">
                    {approvedRequests}
                </span>
            </div>

            <div class="live-item">
                <h3>Rejected Requests</h3>
                <span class="badge danger">
                    {rejectedRequests}
                </span>
            </div>

        </div>

    </div>

    <!-- FOOTER -->
    <footer class="workflow-footer">

        <div>
            <strong>
                Temple Operations Reporting System
            </strong>
        </div>

        <div>
            Enterprise Workflow Engine
        </div>

        <div>
            Last Refresh
            <strong>
                {new Date().toLocaleTimeString()}
            </strong>
        </div>

    </footer>

</div>

<!-- REVIEW DIALOG -->
{#if showDetailsDialog && selectedWorkflow}

    <div
        class="overlay"
        role="presentation"
        on:click={(event) => {
            if (event.target === event.currentTarget) {
                closeDialog();
            }
        }}
    >

        <div
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workflow-review-title"
        >

            <div class="dialog-header">

                <div>
                    <h2 id="workflow-review-title">
                        Workflow Review
                    </h2>

                    <span class="dialog-subtitle">
                        {selectedWorkflow.workflow_id}
                    </span>
                </div>

                <button
                    class="close"
                    on:click={closeDialog}
                    disabled={actionLoading}
                    aria-label="Close"
                >
                    ✕
                </button>

            </div>

            <div class="grid">

                <div class="full detail-block">
                    <label>Title</label>
                    <div class="detail-value">
                        {selectedWorkflow.title}
                    </div>
                </div>

                <div class="detail-block">
                    <label>Reference Type</label>
                    <div class="detail-value">
                        {selectedWorkflow.reference_type}
                    </div>
                </div>

                <div class="detail-block">
                    <label>Reference ID</label>
                    <div class="detail-value">
                        {selectedWorkflow.reference_id}
                    </div>
                </div>

                <div class="detail-block">
                    <label>Priority</label>
                    <div class="detail-value">
                        <span
                            class="priority"
                            class:high={selectedWorkflow.priority === "High"}
                            class:medium={selectedWorkflow.priority === "Medium"}
                            class:low={selectedWorkflow.priority === "Low"}
                        >
                            {selectedWorkflow.priority}
                        </span>
                    </div>
                </div>

                <div class="detail-block">
                    <label>Status</label>
                    <div class="detail-value">
                        <span
                            class="status"
                            class:pending={selectedWorkflow.status === "Pending"}
                            class:approved={selectedWorkflow.status === "Approved"}
                            class:rejected={selectedWorkflow.status === "Rejected"}
                            class:draft={selectedWorkflow.status === "Draft"}
                        >
                            {selectedWorkflow.status}
                        </span>
                    </div>
                </div>

                <div class="detail-block">
                    <label>Submitted By</label>
                    <div class="detail-value">
                        {selectedWorkflow.submitted_by}
                    </div>
                </div>

                <div class="detail-block">
                    <label>Created</label>
                    <div class="detail-value">
                        {new Date(
                            selectedWorkflow.created_at
                        ).toLocaleString()}
                    </div>
                </div>

                <div class="full reviewer-section">

                    <label for="reviewer">
                        Assign Reviewer
                    </label>

                    <div class="reviewer-controls">

                        <select
                            id="reviewer"
                            bind:value={assignedReviewer}
                            disabled={actionLoading}
                        >
                            <option value="">
                                -- Select Reviewer --
                            </option>

                            {#each users as user}
                                <option value={user}>
                                    {user}
                                </option>
                            {/each}
                        </select>

                        <button
                            class="small blue"
                            on:click={assignReviewer}
                            disabled={
                                actionLoading ||
                                !assignedReviewer
                            }
                        >
                            Assign
                        </button>

                    </div>

                </div>

                <div class="full">

                    <label for="review-comments">
                        Reviewer Comments
                    </label>

                    <textarea
                        id="review-comments"
                        rows="5"
                        bind:value={reviewComment}
                        disabled={actionLoading}
                        placeholder="Enter approval or rejection comments..."
                    ></textarea>

                </div>

                <div class="full">

                    <label>
                        Approval Timeline
                    </label>

                    <div class="timeline">

                        {#if activities.length === 0}

                            <div class="empty">
                                No activity available.
                            </div>

                        {:else}

                            {#each activities as activity}

                                <div class="timeline-item">

                                    <div class="dot"></div>

                                    <div class="timeline-content">

                                        <strong>
                                            {activity.action}
                                        </strong>

                                        <div class="activity-user">
                                            {activity.performed_by}
                                        </div>

                                        {#if activity.remarks}

                                            <div class="activity-remarks">
                                                {activity.remarks}
                                            </div>

                                        {/if}

                                        <div class="timeline-date">
                                            {new Date(
                                                activity.created_at
                                            ).toLocaleString()}
                                        </div>

                                    </div>

                                </div>

                            {/each}

                        {/if}

                    </div>

                </div>

            </div>

            <div class="dialog-footer">

                <button
                    class="secondary"
                    on:click={closeDialog}
                    disabled={actionLoading}
                >
                    Cancel
                </button>

                <button
                    class="red"
                    on:click={rejectWorkflow}
                    disabled={actionLoading}
                >
                    {actionLoading ? "Processing..." : "Reject"}
                </button>

                <button
                    class="green"
                    on:click={approveWorkflow}
                    disabled={actionLoading}
                >
                    {actionLoading ? "Processing..." : "Approve"}
                </button>

            </div>

        </div>

    </div>

{/if}

<style>
    :global(*) {
        box-sizing: border-box;
    }

    :global(body) {
        margin: 0;
        background: #f1f5f9;
        color: #0f172a;
        font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
    }

    .page {
        width: 100%;
        max-width: 1500px;
        margin: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
    }

    .page-header h1 {
        margin: 0;
        font-size: 30px;
        font-weight: 800;
        color: #0f172a;
    }

    .page-header p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 14px;
    }

    .dashboard {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
    }

    .card {
        padding: 22px;
        border-radius: 14px;
    }

    .card h2 {
        margin: 0 0 18px;
        font-size: 20px;
        font-weight: 750;
    }

    .card > span {
        display: block;
        font-size: 13px;
        opacity: 0.9;
        margin-bottom: 6px;
    }

    .card > h2 {
        margin: 0;
        font-size: 32px;
    }

    .blue {
        background: #2563eb;
        color: white;
    }

    .orange {
        background: #ea580c;
        color: white;
    }

    .green {
        background: #16a34a;
        color: white;
    }

    .red {
        background: #dc2626;
        color: white;
    }

    .refresh-button {
        border: none;
        border-radius: 9px;
        padding: 10px 16px;
        font-weight: 650;
        cursor: pointer;
    }

    .refresh-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .toolbar {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 12px;
    }

    .toolbar input,
    .toolbar select,
    .reviewer-controls select,
    textarea {
        width: 100%;
        padding: 11px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        background: white;
        color: #0f172a;
        font-size: 14px;
        outline: none;
    }

    .toolbar input:focus,
    .toolbar select:focus,
    .reviewer-controls select:focus,
    textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .table-card,
    .white-card {
        background: white;
        color: #111827;
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07);
        overflow: hidden;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 18px;
    }

    .section-header h2 {
        margin: 0;
        font-size: 20px;
    }

    .section-header span {
        display: block;
        margin-top: 5px;
        color: #64748b;
        font-size: 13px;
    }

    .export-button {
        border: none;
        padding: 9px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 650;
    }

    .export-button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .table-wrapper {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    table {
        width: 100%;
        min-width: 900px;
        border-collapse: collapse;
    }

    th {
        background: #f8fafc;
        color: #475569;
        padding: 13px 12px;
        text-align: left;
        font-size: 12px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
    }

    td {
        padding: 13px 12px;
        border-bottom: 1px solid #e5e7eb;
        vertical-align: middle;
        font-size: 14px;
    }

    tbody tr:hover {
        background: #f8fafc;
    }

    .comment-preview {
        display: block;
        max-width: 300px;
        margin-top: 5px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .reference-cell {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .reference-cell small {
        color: #64748b;
        font-size: 11px;
    }

    .priority,
    .status,
    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
    }

    .priority.high {
        background: #fee2e2;
        color: #991b1b;
    }

    .priority.medium {
        background: #ffedd5;
        color: #9a3412;
    }

    .priority.low {
        background: #dbeafe;
        color: #1d4ed8;
    }

    .status.pending {
        background: #fef3c7;
        color: #92400e;
    }

    .status.approved {
        background: #dcfce7;
        color: #166534;
    }

    .status.rejected {
        background: #fee2e2;
        color: #991b1b;
    }

    .status.draft {
        background: #e5e7eb;
        color: #475569;
    }

    .small {
        border: none;
        padding: 7px 12px;
        border-radius: 7px;
        color: white;
        cursor: pointer;
        font-weight: 650;
        font-size: 12px;
    }

    .small:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .loading {
        padding: 40px;
        text-align: center;
        color: #64748b;
    }

    .empty-state {
        padding: 45px 20px;
        text-align: center;
        color: #64748b;
    }

    .empty-state.compact {
        padding: 25px;
    }

    .empty-icon {
        font-size: 40px;
        margin-bottom: 10px;
    }

    .empty-state h3 {
        margin: 0 0 6px;
        color: #334155;
    }

    .empty-state p {
        margin: 0;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .pagination button {
        border: none;
        padding: 9px 15px;
        border-radius: 8px;
        background: #2563eb;
        color: white;
        cursor: pointer;
        font-weight: 650;
    }

    .pagination button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .analytics-grid,
    .summary-grid,
    .live-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-top: 18px;
    }

    .analytics-item,
    .summary-item,
    .live-item {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 18px;
        border-radius: 11px;
        text-align: center;
    }

    .analytics-item h3,
    .summary-item h3 {
        margin: 0;
        font-size: 28px;
        color: #2563eb;
    }

    .analytics-item span,
    .summary-item label {
        display: block;
        margin-top: 6px;
        color: #64748b;
        font-size: 13px;
    }

    .live-item h3 {
        margin: 0 0 10px;
        font-size: 15px;
    }

    .badge.success {
        background: #dcfce7;
        color: #166534;
    }

    .badge.warning {
        background: #fef3c7;
        color: #92400e;
    }

    .badge.danger {
        background: #fee2e2;
        color: #991b1b;
    }

    .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 18px;
    }

    .action-buttons button {
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 650;
    }

    .action-buttons button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .skeleton-row {
        height: 48px;
        background: #f1f5f9;
        border-radius: 8px;
        margin-bottom: 12px;
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

    .overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
    }

    .dialog {
        width: 900px;
        max-width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 22px;
    }

    .dialog-header h2 {
        margin: 0;
        font-size: 23px;
    }

    .dialog-subtitle {
        display: block;
        margin-top: 5px;
        color: #64748b;
        font-size: 12px;
    }

    .close {
        border: none;
        background: #f1f5f9;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        color: #475569;
    }

    .close:hover {
        background: #e2e8f0;
    }

    .close:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
    }

    .full {
        grid-column: 1 / -1;
    }

    .detail-block label,
    .reviewer-section label {
        display: block;
        margin-bottom: 7px;
        font-size: 13px;
        font-weight: 700;
        color: #334155;
    }

    .detail-value {
        min-height: 42px;
        display: flex;
        align-items: center;
        padding: 10px 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #0f172a;
    }

    .reviewer-controls {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
    }

    textarea {
        resize: vertical;
        min-height: 120px;
        font-family: inherit;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
        padding-top: 18px;
        border-top: 1px solid #e5e7eb;
    }

    .dialog-footer button {
        border: none;
        padding: 10px 18px;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-weight: 700;
    }

    .dialog-footer button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .secondary {
        background: #64748b;
    }

    .timeline {
        display: flex;
        flex-direction: column;
        gap: 18px;
        margin-top: 12px;
        padding: 8px 4px;
    }

    .timeline-item {
        display: flex;
        align-items: flex-start;
        gap: 13px;
    }

    .dot {
        width: 12px;
        height: 12px;
        margin-top: 5px;
        flex: 0 0 12px;
        border-radius: 50%;
        background: #2563eb;
        box-shadow: 0 0 0 4px #dbeafe;
    }

    .timeline-content {
        flex: 1;
        min-width: 0;
    }

    .timeline-content strong {
        color: #0f172a;
    }

    .activity-user {
        margin-top: 3px;
        color: #475569;
        font-size: 13px;
    }

    .activity-remarks {
        margin-top: 7px;
        padding: 9px 11px;
        background: #f8fafc;
        border-radius: 7px;
        color: #475569;
        white-space: pre-wrap;
        word-break: break-word;
    }

    .timeline-date {
        margin-top: 5px;
        color: #94a3b8;
        font-size: 11px;
    }

    .empty {
        padding: 18px;
        text-align: center;
        background: #f8fafc;
        border-radius: 9px;
        color: #64748b;
    }

    .workflow-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 20px 0;
        margin-top: 10px;
        border-top: 1px solid #e2e8f0;
        color: #64748b;
        font-size: 13px;
    }

    .workflow-footer strong {
        color: #334155;
    }

    @media (max-width: 1100px) {
        .dashboard {
            grid-template-columns: repeat(2, 1fr);
        }

        .analytics-grid,
        .summary-grid,
        .live-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 800px) {
        .page {
            padding: 16px;
        }

        .page-header {
            align-items: flex-start;
            flex-direction: column;
        }

        .toolbar {
            grid-template-columns: 1fr;
        }

        .grid {
            grid-template-columns: 1fr;
        }

        .full {
            grid-column: auto;
        }

        .section-header {
            align-items: flex-start;
            flex-direction: column;
        }

        .reviewer-controls {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 600px) {
        .dashboard,
        .analytics-grid,
        .summary-grid,
        .live-grid {
            grid-template-columns: 1fr;
        }

        .page-header h1 {
            font-size: 24px;
        }

        .table-card,
        .white-card,
        .card {
            padding: 16px;
            border-radius: 12px;
        }

        .dialog {
            padding: 18px;
            border-radius: 12px;
        }

        .dialog-footer {
            flex-direction: column-reverse;
        }

        .dialog-footer button {
            width: 100%;
        }

        .workflow-footer {
            flex-direction: column;
            text-align: center;
        }

        .overlay {
            padding: 10px;
        }
    }

    @media print {
        :global(body) {
            background: white;
        }

        .page {
            max-width: none;
            padding: 0;
        }

        .toolbar,
        .action-buttons,
        .refresh-button,
        .pagination,
        .dialog,
        .overlay {
            display: none !important;
        }

        .table-card,
        .white-card,
        .card {
            box-shadow: none;
            border: 1px solid #ddd;
            break-inside: avoid;
        }
    }
</style>
```
