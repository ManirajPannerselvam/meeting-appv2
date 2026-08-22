<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase/client";
    import { toast } from "svelte-sonner";

    interface NotificationRecord {
        notification_id: string;
        title: string;
        message: string;
        notification_type: string;
        recipient_type: string;
        recipient_id: string | null;
        status: string;
        scheduled_at: string | null;
        created_at: string;
    }

    type NotificationType = "Email" | "SMS" | "Push";
    type NotificationStatus =
        | "Pending"
        | "Sent"
        | "Scheduled"
        | "Failed"
        | "Cancelled";

    let loading = true;
    let saving = false;

    let notifications: NotificationRecord[] = [];
    let filteredNotifications: NotificationRecord[] = [];

    let search = "";
    let typeFilter = "All";
    let statusFilter = "All";

    let showComposeDialog = false;
    let showDetailsDialog = false;

    let selectedNotification: NotificationRecord | null = null;

    let composeForm: {
        title: string;
        message: string;
        notification_type: NotificationType;
        recipient_type: string;
        recipient_id: string | null;
        scheduled_at: string;
    } = {
        title: "",
        message: "",
        notification_type: "Email",
        recipient_type: "All Users",
        recipient_id: null,
        scheduled_at: ""
    };

    // ============================================================
    // PAGINATION
    // ============================================================

    let currentPage = 1;
    let pageSize = 20;

    $: totalPages = Math.max(
        1,
        Math.ceil(filteredNotifications.length / pageSize)
    );

    $: paginatedNotifications = filteredNotifications.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // ============================================================
    // DASHBOARD
    // ============================================================

    $: totalNotifications = notifications.length;

    $: pendingNotifications = notifications.filter(
        (notification) => notification.status === "Pending"
    ).length;

    $: sentNotifications = notifications.filter(
        (notification) => notification.status === "Sent"
    ).length;

    $: failedNotifications = notifications.filter(
        (notification) => notification.status === "Failed"
    ).length;

    $: scheduledNotifications = notifications.filter(
        (notification) => notification.status === "Scheduled"
    ).length;

    // ============================================================
    // LOAD NOTIFICATIONS
    // ============================================================

    async function loadNotifications(): Promise<void> {
        loading = true;

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5000);

            if (error) {
                throw error;
            }

            notifications = (data ?? []) as NotificationRecord[];
            applyFilters();
        } catch (error: unknown) {
            console.error("Failed to load notifications:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load notifications"
            );
        } finally {
            loading = false;
        }
    }

    // ============================================================
    // FILTERS
    // ============================================================

    function applyFilters(): void {
        const keyword = search.trim().toLowerCase();

        filteredNotifications = notifications.filter((notification) => {
            const title =
                notification.title?.toLowerCase() ?? "";

            const message =
                notification.message?.toLowerCase() ?? "";

            const okSearch =
                !keyword ||
                title.includes(keyword) ||
                message.includes(keyword);

            const okType =
                typeFilter === "All" ||
                notification.notification_type === typeFilter;

            const okStatus =
                statusFilter === "All" ||
                notification.status === statusFilter;

            return okSearch && okType && okStatus;
        });

        const maxPage = Math.max(
            1,
            Math.ceil(filteredNotifications.length / pageSize)
        );

        if (currentPage > maxPage) {
            currentPage = maxPage;
        }
    }

    $: search;
    $: typeFilter;
    $: statusFilter;
    $: notifications;
    $: applyFilters();

    // ============================================================
    // COMPOSE
    // ============================================================

    function compose(): void {
        composeForm = {
            title: "",
            message: "",
            notification_type: "Email",
            recipient_type: "All Users",
            recipient_id: null,
            scheduled_at: ""
        };

        showComposeDialog = true;
    }

    function validate(): boolean {
        if (!composeForm.title.trim()) {
            toast.error("Title is required");
            return false;
        }

        if (!composeForm.message.trim()) {
            toast.error("Message is required");
            return false;
        }

        if (
            composeForm.recipient_type === "Single User" &&
            !composeForm.recipient_id
        ) {
            toast.error("Recipient user is required");
            return false;
        }

        return true;
    }

    async function saveNotification(sendNow = true): Promise<void> {
        if (!validate()) {
            return;
        }

        saving = true;

        try {
            const payload = {
                title: composeForm.title.trim(),
                message: composeForm.message.trim(),
                notification_type: composeForm.notification_type,
                recipient_type: composeForm.recipient_type,
                recipient_id: composeForm.recipient_id,
                scheduled_at: sendNow
                    ? null
                    : composeForm.scheduled_at || null,
                status: sendNow ? "Pending" : "Scheduled"
            };

            const { error } = await supabase
                .from("notifications")
                .insert(payload);

            if (error) {
                throw error;
            }

            toast.success(
                sendNow
                    ? "Notification queued"
                    : "Notification scheduled"
            );

            showComposeDialog = false;

            await loadNotifications();
        } catch (error: unknown) {
            console.error("Failed to save notification:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save notification"
            );
        } finally {
            saving = false;
        }
    }

    // ============================================================
    // VIEW
    // ============================================================

    function viewNotification(
        notification: NotificationRecord
    ): void {
        selectedNotification = notification;
        showDetailsDialog = true;
    }

    // ============================================================
    // RETRY
    // ============================================================

    async function retryNotification(
        notification: NotificationRecord
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({
                    status: "Pending"
                })
                .eq(
                    "notification_id",
                    notification.notification_id
                );

            if (error) {
                throw error;
            }

            toast.success("Notification queued again");

            await loadNotifications();
        } catch (error: unknown) {
            console.error("Retry failed:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to retry notification"
            );
        }
    }

    // ============================================================
    // CANCEL
    // ============================================================

    async function cancelNotification(
        notification: NotificationRecord
    ): Promise<void> {
        if (!confirm("Cancel this scheduled notification?")) {
            return;
        }

        try {
            const { error } = await supabase
                .from("notifications")
                .update({
                    status: "Cancelled"
                })
                .eq(
                    "notification_id",
                    notification.notification_id
                );

            if (error) {
                throw error;
            }

            toast.success("Notification cancelled");

            await loadNotifications();
        } catch (error: unknown) {
            console.error("Cancel failed:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to cancel notification"
            );
        }
    }

    // ============================================================
    // DELETE
    // ============================================================

    async function deleteNotification(
        notification: NotificationRecord
    ): Promise<void> {
        if (!confirm("Delete this notification?")) {
            return;
        }

        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq(
                    "notification_id",
                    notification.notification_id
                );

            if (error) {
                throw error;
            }

            toast.success("Notification deleted");

            await loadNotifications();
        } catch (error: unknown) {
            console.error("Delete failed:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete notification"
            );
        }
    }

    // ============================================================
    // EXPORT CSV
    // ============================================================

    function escapeCSV(value: unknown): string {
        const text = String(value ?? "");

        return `"${text.replace(/"/g, '""')}"`;
    }

    function exportCSV(): void {
        const headers = [
            "Title",
            "Type",
            "Recipient",
            "Status",
            "Scheduled",
            "Created",
            "Message"
        ];

        const rows = filteredNotifications.map((notification) => [
            escapeCSV(notification.title),
            escapeCSV(notification.notification_type),
            escapeCSV(notification.recipient_type),
            escapeCSV(notification.status),
            escapeCSV(notification.scheduled_at ?? ""),
            escapeCSV(notification.created_at),
            escapeCSV(notification.message)
        ]);

        const csv = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) => row.join(","))
        ].join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "notifications.csv";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        URL.revokeObjectURL(url);

        toast.success("Notifications exported");
    }

    // ============================================================
    // PRINT
    // ============================================================

    function printLogs(): void {
        window.print();
    }

    // ============================================================
    // PAGINATION
    // ============================================================

    function previousPage(): void {
        if (currentPage > 1) {
            currentPage--;
        }
    }

    function nextPage(): void {
        if (currentPage < totalPages) {
            currentPage++;
        }
    }

    // ============================================================
    // DIALOG HELPERS
    // ============================================================

    function closeComposeDialog(): void {
        if (saving) {
            return;
        }

        showComposeDialog = false;
    }

    function closeDetailsDialog(): void {
        showDetailsDialog = false;
        selectedNotification = null;
    }

    // ============================================================
    // INIT
    // ============================================================

    onMount(() => {
        loadNotifications();
    });
</script>

<div class="page">

    <!-- ========================================================
         HEADER
    ========================================================= -->

    <div class="page-header">
        <div>
            <h1>🔔 Notification Center</h1>
            <p>Enterprise Notification Management</p>
        </div>

        <button class="green" on:click={compose}>
            ➕ Compose Notification
        </button>
    </div>

    <!-- ========================================================
         DASHBOARD
    ========================================================= -->

    <div class="dashboard">

        <div class="stat-card blue">
            <h2>{totalNotifications}</h2>
            <span>Total</span>
        </div>

        <div class="stat-card orange">
            <h2>{pendingNotifications}</h2>
            <span>Pending</span>
        </div>

        <div class="stat-card green">
            <h2>{sentNotifications}</h2>
            <span>Sent</span>
        </div>

        <div class="stat-card red">
            <h2>{failedNotifications}</h2>
            <span>Failed</span>
        </div>

    </div>

    <!-- ========================================================
         TOOLBAR
    ========================================================= -->

    <div class="toolbar">

        <input
            bind:value={search}
            placeholder="Search title or message..."
        />

        <select bind:value={typeFilter}>
            <option value="All">All Types</option>
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="Push">Push</option>
        </select>

        <select bind:value={statusFilter}>
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Sent">Sent</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Failed">Failed</option>
            <option value="Cancelled">Cancelled</option>
        </select>

    </div>

    <!-- ========================================================
         ACTION BUTTONS
    ========================================================= -->

    <div class="action-buttons">

        <button class="blue" on:click={exportCSV}>
            📤 Export CSV
        </button>

        <button class="orange" on:click={printLogs}>
            🖨 Print Report
        </button>

        <button
            class="secondary-action"
            on:click={loadNotifications}
            disabled={loading}
        >
            🔄 Refresh
        </button>

    </div>

    <!-- ========================================================
         TABLE
    ========================================================= -->

    <div class="table-card">

        {#if loading}

            <div class="skeleton">
                {#each Array(6) as _}
                    <div class="skeleton-row"></div>
                {/each}
            </div>

        {:else if filteredNotifications.length === 0}

            <div class="loading">
                <div class="empty-icon">🔔</div>
                <h3>No Notifications Found</h3>
                <p>
                    There are no notifications matching the current filters.
                </p>
            </div>

        {:else}

            <table>

                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Recipient</th>
                        <th>Status</th>
                        <th>Scheduled</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>

                    {#each paginatedNotifications as notification}

                        <tr>

                            <td>
                                <strong>
                                    {notification.title}
                                </strong>

                                <small class="message-preview">
                                    {notification.message}
                                </small>
                            </td>

                            <td>
                                {notification.notification_type}
                            </td>

                            <td>
                                {notification.recipient_type}
                            </td>

                            <td>

                                <span
                                    class="status"
                                    class:pending={notification.status === "Pending"}
                                    class:sent={notification.status === "Sent"}
                                    class:failed={notification.status === "Failed"}
                                    class:scheduled={notification.status === "Scheduled"}
                                    class:cancelled={notification.status === "Cancelled"}
                                >
                                    {notification.status}
                                </span>

                            </td>

                            <td>
                                {notification.scheduled_at
                                    ? new Date(
                                        notification.scheduled_at
                                    ).toLocaleString()
                                    : "-"}
                            </td>

                            <td>

                                <div class="actions">

                                    <button
                                        class="small blue"
                                        on:click={() =>
                                            viewNotification(notification)}
                                    >
                                        View
                                    </button>

                                    {#if notification.status === "Failed"}

                                        <button
                                            class="small orange"
                                            on:click={() =>
                                                retryNotification(notification)}
                                        >
                                            Retry
                                        </button>

                                    {/if}

                                    {#if notification.status === "Scheduled"}

                                        <button
                                            class="small red"
                                            on:click={() =>
                                                cancelNotification(notification)}
                                        >
                                            Cancel
                                        </button>

                                    {/if}

                                    <button
                                        class="small red"
                                        on:click={() =>
                                            deleteNotification(notification)}
                                    >
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>

                    {/each}

                </tbody>

            </table>

        {/if}

    </div>

    <!-- ========================================================
         PAGINATION
    ========================================================= -->

    {#if !loading && filteredNotifications.length > 0}

        <div class="pagination">

            <button
                on:click={previousPage}
                disabled={currentPage === 1}
            >
                ◀ Previous
            </button>

            <span>
                Page {currentPage} of {totalPages}
                · {filteredNotifications.length} records
            </span>

            <button
                on:click={nextPage}
                disabled={currentPage === totalPages}
            >
                Next ▶
            </button>

        </div>

    {/if}

    <!-- ========================================================
         ANALYTICS
    ========================================================= -->

    <div class="card">

        <h2>📊 Notification Analytics</h2>

        <div class="analytics-grid">

            <div class="analytics-card blue">
                <h3>{totalNotifications}</h3>
                <span>Total Notifications</span>
            </div>

            <div class="analytics-card green">
                <h3>{sentNotifications}</h3>
                <span>Delivered</span>
            </div>

            <div class="analytics-card orange">
                <h3>{pendingNotifications}</h3>
                <span>Pending Queue</span>
            </div>

            <div class="analytics-card red">
                <h3>{failedNotifications}</h3>
                <span>Failed</span>
            </div>

        </div>

    </div>

    <!-- ========================================================
         DELIVERY QUEUE
    ========================================================= -->

    <div class="card">

        <h2>📬 Delivery Queue</h2>

        <div class="table-wrapper">

            <table>

                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Pending</th>
                        <th>Sent</th>
                        <th>Failed</th>
                    </tr>
                </thead>

                <tbody>

                    {#each ["Email", "SMS", "Push"] as type}

                        <tr>

                            <td>
                                <strong>{type}</strong>
                            </td>

                            <td>
                                {notifications.filter(
                                    (notification) =>
                                        notification.notification_type === type &&
                                        notification.status === "Pending"
                                ).length}
                            </td>

                            <td>
                                {notifications.filter(
                                    (notification) =>
                                        notification.notification_type === type &&
                                        notification.status === "Sent"
                                ).length}
                            </td>

                            <td>
                                {notifications.filter(
                                    (notification) =>
                                        notification.notification_type === type &&
                                        notification.status === "Failed"
                                ).length}
                            </td>

                        </tr>

                    {/each}

                </tbody>

            </table>

        </div>

    </div>

    <!-- ========================================================
         SCHEDULED
    ========================================================= -->

    <div class="card">

        <h2>📅 Scheduled Notifications</h2>

        <div class="table-wrapper">

            <table>

                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Channel</th>
                        <th>Schedule</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>

                    {#if scheduledNotifications === 0}

                        <tr>
                            <td colspan="4" class="empty-table">
                                No scheduled notifications
                            </td>
                        </tr>

                    {:else}

                        {#each notifications.filter(
                            (notification) =>
                                notification.status === "Scheduled"
                        ) as item}

                            <tr>

                                <td>
                                    <strong>{item.title}</strong>
                                </td>

                                <td>
                                    {item.notification_type}
                                </td>

                                <td>
                                    {item.scheduled_at
                                        ? new Date(
                                            item.scheduled_at
                                        ).toLocaleString()
                                        : "-"}
                                </td>

                                <td>
                                    <span class="status scheduled">
                                        Scheduled
                                    </span>
                                </td>

                            </tr>

                        {/each}

                    {/if}

                </tbody>

            </table>

        </div>

    </div>

    <!-- ========================================================
         RECENT
    ========================================================= -->

    <div class="card">

        <h2>🕒 Recent Notifications</h2>

        <div class="timeline">

            {#if notifications.length === 0}

                <div class="empty-table">
                    No recent notifications
                </div>

            {:else}

                {#each notifications.slice(0, 8) as item}

                    <div class="timeline-item">

                        <div class="dot"></div>

                        <div class="timeline-content">

                            <strong>{item.title}</strong>

                            <div>
                                {item.notification_type}
                                •
                                {item.recipient_type}
                            </div>

                            <small>
                                {new Date(
                                    item.created_at
                                ).toLocaleString()}
                            </small>

                        </div>

                    </div>

                {/each}

            {/if}

        </div>

    </div>

    <!-- ========================================================
         BROADCAST
    ========================================================= -->

    <div class="card broadcast-card">

        <h2>📢 Broadcast Notification</h2>

        <p>
            Send an announcement to every active user.
        </p>

        <button class="green" on:click={compose}>
            Create Broadcast
        </button>

    </div>

    <!-- ========================================================
         FOOTER
    ========================================================= -->

    <footer class="notification-footer">

        <div>
            Enterprise Temple Operations Reporting System
        </div>

        <div>
            Notification Center
        </div>

        <div>
            Total Notifications
            <strong>{totalNotifications}</strong>
        </div>

    </footer>

</div>

<!-- ============================================================
     COMPOSE DIALOG
============================================================= -->

{#if showComposeDialog}

    <div class="overlay">

        <div
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
        >

            <div class="dialog-header">

                <h2 id="compose-title">
                    Compose Notification
                </h2>

                <button
                    class="close"
                    on:click={closeComposeDialog}
                    disabled={saving}
                    aria-label="Close"
                >
                    ✕
                </button>

            </div>

            <div class="grid">

                <div class="full">

                    <label for="notification-title">
                        Title
                    </label>

                    <input
                        id="notification-title"
                        bind:value={composeForm.title}
                        placeholder="Notification title"
                        disabled={saving}
                    />

                </div>

                <div class="full">

                    <label for="notification-message">
                        Message
                    </label>

                    <textarea
                        id="notification-message"
                        rows="6"
                        bind:value={composeForm.message}
                        placeholder="Enter notification message..."
                        disabled={saving}
                    ></textarea>

                </div>

                <div>

                    <label for="notification-type">
                        Notification Type
                    </label>

                    <select
                        id="notification-type"
                        bind:value={composeForm.notification_type}
                        disabled={saving}
                    >
                        <option value="Email">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="Push">Push</option>
                    </select>

                </div>

                <div>

                    <label for="recipient-type">
                        Recipient
                    </label>

                    <select
                        id="recipient-type"
                        bind:value={composeForm.recipient_type}
                        disabled={saving}
                    >
                        <option value="All Users">
                            All Users
                        </option>

                        <option value="Managers">
                            Managers
                        </option>

                        <option value="Supervisors">
                            Supervisors
                        </option>

                        <option value="Operators">
                            Operators
                        </option>

                        <option value="Single User">
                            Single User
                        </option>
                    </select>

                </div>

                {#if composeForm.recipient_type === "Single User"}

                    <div class="full">

                        <label for="recipient-id">
                            Recipient User ID
                        </label>

                        <input
                            id="recipient-id"
                            bind:value={composeForm.recipient_id}
                            placeholder="Enter user UUID"
                            disabled={saving}
                        />

                    </div>

                {/if}

                <div class="full">

                    <label for="scheduled-at">
                        Schedule
                    </label>

                    <input
                        id="scheduled-at"
                        type="datetime-local"
                        bind:value={composeForm.scheduled_at}
                        disabled={saving}
                    />

                    <small class="field-help">
                        Leave empty when using Send Now.
                    </small>

                </div>

            </div>

            <div class="dialog-footer">

                <button
                    class="secondary"
                    on:click={closeComposeDialog}
                    disabled={saving}
                >
                    Cancel
                </button>

                <button
                    class="orange"
                    disabled={saving}
                    on:click={() => saveNotification(false)}
                >
                    {saving ? "Saving..." : "Schedule"}
                </button>

                <button
                    class="green"
                    disabled={saving}
                    on:click={() => saveNotification(true)}
                >
                    {saving ? "Sending..." : "Send Now"}
                </button>

            </div>

        </div>

    </div>

{/if}

<!-- ============================================================
     DETAILS DIALOG
============================================================= -->

{#if showDetailsDialog && selectedNotification}

    <div class="overlay">

        <div
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
        >

            <div class="dialog-header">

                <h2 id="details-title">
                    Notification Details
                </h2>

                <button
                    class="close"
                    on:click={closeDetailsDialog}
                    aria-label="Close"
                >
                    ✕
                </button>

            </div>

            <div class="detail-grid">

                <div>
                    <label>Notification ID</label>
                    <div class="detail-value">
                        {selectedNotification.notification_id}
                    </div>
                </div>

                <div>
                    <label>Title</label>
                    <div class="detail-value">
                        {selectedNotification.title}
                    </div>
                </div>

                <div>
                    <label>Type</label>
                    <div class="detail-value">
                        {selectedNotification.notification_type}
                    </div>
                </div>

                <div>
                    <label>Recipient</label>
                    <div class="detail-value">
                        {selectedNotification.recipient_type}
                    </div>
                </div>

                <div>
                    <label>Recipient ID</label>
                    <div class="detail-value">
                        {selectedNotification.recipient_id ?? "-"}
                    </div>
                </div>

                <div>
                    <label>Status</label>

                    <div>
                        <span
                            class="status"
                            class:pending={selectedNotification.status === "Pending"}
                            class:sent={selectedNotification.status === "Sent"}
                            class:failed={selectedNotification.status === "Failed"}
                            class:scheduled={selectedNotification.status === "Scheduled"}
                            class:cancelled={selectedNotification.status === "Cancelled"}
                        >
                            {selectedNotification.status}
                        </span>
                    </div>

                </div>

                <div class="full">

                    <label>Message</label>

                    <div class="message-box">
                        {selectedNotification.message}
                    </div>

                </div>

                <div>

                    <label>Created</label>

                    <div class="detail-value">
                        {new Date(
                            selectedNotification.created_at
                        ).toLocaleString()}
                    </div>

                </div>

                <div>

                    <label>Scheduled</label>

                    <div class="detail-value">
                        {selectedNotification.scheduled_at
                            ? new Date(
                                selectedNotification.scheduled_at
                            ).toLocaleString()
                            : "-"}
                    </div>

                </div>

            </div>

            <div class="dialog-footer">

                <button
                    class="secondary"
                    on:click={closeDetailsDialog}
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
        gap: 20px;
    }

    .page-header h1 {
        margin: 0;
        color: #0f172a;
        font-size: 30px;
        font-weight: 800;
    }

    .page-header p {
        margin: 6px 0 0;
        color: #64748b;
    }

    button {
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        cursor: pointer;
        font-weight: 600;
        transition:
            transform 0.15s ease,
            opacity 0.15s ease,
            box-shadow 0.15s ease;
    }

    button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .dashboard {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
    }

    .stat-card {
        padding: 22px;
        border-radius: 12px;
        color: white;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    .stat-card h2 {
        margin: 0;
        font-size: 32px;
        color: white;
    }

    .stat-card span {
        display: block;
        margin-top: 5px;
        opacity: 0.9;
        font-size: 14px;
    }

    .blue {
        background: #2563eb;
    }

    .green {
        background: #16a34a;
        color: white;
    }

    .orange {
        background: #ea580c;
        color: white;
    }

    .red {
        background: #dc2626;
        color: white;
    }

    .toolbar {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 12px;
    }

    .toolbar input,
    .toolbar select,
    .grid input,
    .grid select,
    .grid textarea {
        box-sizing: border-box;
        width: 100%;
        padding: 11px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
        color: #0f172a;
        outline: none;
    }

    .toolbar input:focus,
    .toolbar select:focus,
    .grid input:focus,
    .grid select:focus,
    .grid textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }

    .secondary-action {
        background: #475569;
        color: white;
    }

    .table-card,
    .card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    .card h2 {
        margin: 0;
        color: #0f172a;
        font-size: 22px;
    }

    .card > p {
        color: #64748b;
    }

    .table-wrapper {
        width: 100%;
        overflow-x: auto;
        margin-top: 16px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        min-width: 700px;
    }

    th {
        background: #f8fafc;
        padding: 12px;
        text-align: left;
        color: #475569;
        font-size: 13px;
        font-weight: 700;
    }

    td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        color: #334155;
        vertical-align: middle;
    }

    tr:hover td {
        background: #f8fafc;
    }

    .message-preview {
        display: block;
        max-width: 320px;
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .status {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
    }

    .pending {
        background: #ffedd5;
        color: #c2410c;
    }

    .sent {
        background: #dcfce7;
        color: #15803d;
    }

    .failed {
        background: #fee2e2;
        color: #b91c1c;
    }

    .scheduled {
        background: #dbeafe;
        color: #1d4ed8;
    }

    .cancelled {
        background: #e5e7eb;
        color: #475569;
    }

    .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .small {
        padding: 6px 10px;
        font-size: 12px;
        color: white;
    }

    .loading {
        padding: 50px 20px;
        text-align: center;
        color: #64748b;
    }

    .empty-icon {
        font-size: 38px;
        margin-bottom: 8px;
    }

    .loading h3 {
        margin: 0 0 6px;
        color: #334155;
    }

    .loading p {
        margin: 0;
        color: #64748b;
    }

    .empty-table {
        text-align: center;
        padding: 30px;
        color: #64748b;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
    }

    .pagination button {
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

    .analytics-card {
        padding: 20px;
        border-radius: 12px;
        color: white;
        text-align: center;
    }

    .analytics-card h3 {
        margin: 0;
        font-size: 32px;
        color: white;
    }

    .analytics-card span {
        display: block;
        margin-top: 6px;
        opacity: 0.9;
        font-size: 13px;
    }

    .timeline {
        display: flex;
        flex-direction: column;
        gap: 18px;
        margin-top: 18px;
    }

    .timeline-item {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        padding-bottom: 14px;
        border-bottom: 1px solid #e5e7eb;
    }

    .dot {
        flex: 0 0 auto;
        width: 12px;
        height: 12px;
        background: #2563eb;
        border-radius: 50%;
        margin-top: 6px;
    }

    .timeline-content {
        color: #475569;
    }

    .timeline-content strong {
        color: #0f172a;
    }

    .timeline-content small {
        display: block;
        margin-top: 4px;
        color: #94a3b8;
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

    .broadcast-card {
        background: linear-gradient(
            135deg,
            #eff6ff,
            #ffffff
        );
        border: 1px solid #dbeafe;
    }

    .broadcast-card h2 {
        color: #1e3a8a;
    }

    .notification-footer {
        margin-top: 10px;
        padding: 20px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        border-top: 1px solid #e5e7eb;
        color: #64748b;
        font-size: 13px;
    }

    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        padding: 20px;
    }

    .dialog {
        box-sizing: border-box;
        background: white;
        width: 760px;
        max-width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 14px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 22px;
    }

    .dialog-header h2 {
        margin: 0;
        color: #0f172a;
    }

    .close {
        background: transparent;
        color: #64748b;
        border: none;
        font-size: 24px;
        padding: 4px 8px;
    }

    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
    }

    .full {
        grid-column: 1 / -1;
    }

    label {
        display: block;
        margin-bottom: 6px;
        color: #334155;
        font-size: 13px;
        font-weight: 700;
    }

    .field-help {
        display: block;
        margin-top: 5px;
        color: #94a3b8;
        font-size: 12px;
    }

    textarea {
        resize: vertical;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        flex-wrap: wrap;
    }

    .secondary {
        background: #64748b;
        color: white;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
    }

    .detail-value {
        min-height: 20px;
        color: #334155;
        word-break: break-word;
    }

    .message-box {
        background: #f8fafc;
        padding: 16px;
        border-radius: 8px;
        min-height: 120px;
        white-space: pre-wrap;
        line-height: 1.6;
        color: #334155;
    }

    @media (max-width: 900px) {
        .dashboard,
        .analytics-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .toolbar {
            grid-template-columns: 1fr;
        }

        .page-header {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    @media (max-width: 600px) {
        .page {
            padding: 14px;
            gap: 14px;
        }

        .page-header h1 {
            font-size: 24px;
        }

        .dashboard,
        .analytics-grid {
            grid-template-columns: 1fr;
        }

        .grid,
        .detail-grid {
            grid-template-columns: 1fr;
        }

        .full {
            grid-column: auto;
        }

        .notification-footer {
            flex-direction: column;
            text-align: center;
        }

        .dialog {
            padding: 18px;
        }

        .dialog-footer {
            flex-direction: column;
        }

        .dialog-footer button {
            width: 100%;
        }

        .pagination {
            flex-direction: column;
        }
    }

    @media print {
        .page {
            max-width: none;
            padding: 0;
        }

        .action-buttons,
        .toolbar,
        .page-header button,
        .pagination,
        .actions,
        .broadcast-card,
        .notification-footer {
            display: none !important;
        }

        .card,
        .table-card {
            box-shadow: none;
            border: 1px solid #e5e7eb;
        }
    }
</style>