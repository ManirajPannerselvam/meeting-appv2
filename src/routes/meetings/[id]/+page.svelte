<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { getMeetingById } from "$lib/stores/meetings";

    let meeting: any = null;
    let loading = true;

    $: id = $page.params.id;

    onMount(async () => {
        loading = true;
        meeting = await getMeetingById(Number(id));
        loading = false;
    });

    function formatDate(date: string) {
        if (!date) return "-";
        const d = new Date(date);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatTime(time: string | null | undefined) {
        if (!time) return "--:--";
        if (time.length === 5) return time;
        if (time.length >= 8) return time.substring(0, 5);
        return time;
    }

    function getMeetingStatus(m: any): string {
        if (!m?.meeting_date) return "Unknown";
        if (m.completed || m.status === 'completed') return "Completed";

        const now = new Date();
        const meetingDateTime = new Date(`${m.meeting_date}T${m.start_time || "00:00"}`);

        if (isNaN(meetingDateTime.getTime())) return "Unknown";

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const meetingDay = new Date(meetingDateTime);
        meetingDay.setHours(0, 0, 0, 0);

        if (meetingDay.getTime() === today.getTime()) {
            if (meetingDateTime > now) return "Today";
            const endTime = new Date(`${m.meeting_date}T${m.end_time || "23:59"}`);
            if (endTime < now) return "Completed";
            return "In Progress";
        }

        if (meetingDateTime > now) return "Upcoming";
        return "Overdue";
    }
</script>

<div class="page">
    <div class="header">
        <h1>📋 Meeting Details</h1>
        <button class="back-btn" on:click={() => goto("/meeting-list")}>
            ← Back to list
        </button>
    </div>

    {#if loading}
        <div class="loading">Loading meeting...</div>
    {:else if !meeting}
        <div class="error">
            <h2>❌ Meeting Not Found</h2>
            <p>Meeting with ID #{id} does not exist.</p>
            <button class="primary" on:click={() => goto("/meeting-list")}>
                Back to Meeting List
            </button>
        </div>
    {:else}
        <div class="details-grid">
            <!-- Main Info Card -->
            <div class="card main-card">
                <div class="card-header">
                    <h2>{meeting.title}</h2>
                    <span class="badge {getMeetingStatus(meeting).toLowerCase().replace(' ', '-')}">
                        {getMeetingStatus(meeting)}
                    </span>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">📝 Type</span>
                        <strong>{meeting.type || "-"}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">🏢 Department</span>
                        <strong>{meeting.department || "-"}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">⚠️ Priority</span>
                        <strong class="priority-{meeting.priority?.toLowerCase()}">{meeting.priority || "-"}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">📅 Date</span>
                        <strong>{formatDate(meeting.meeting_date)}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">🕒 Time</span>
                        <strong>{formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">📍 Location</span>
                        <strong>{meeting.location || "-"}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">💻 Mode</span>
                        <strong>{meeting.meeting_mode || "-"}</strong>
                    </div>
                    <div class="info-item">
                        <span class="label">👤 Organizer</span>
                        <strong>{meeting.organizer || "-"}</strong>
                    </div>
                    {#if meeting.meeting_link}
                    <div class="info-item full-width">
                        <span class="label">🔗 Meeting Link</span>
                        <a href={meeting.meeting_link} target="_blank" class="link">{meeting.meeting_link}</a>
                    </div>
                    {/if}
                </div>
            </div>

            <!-- Participants Card -->
            {#if meeting.participants && meeting.participants.length > 0}
            <div class="card">
                <h3>👥 Participants</h3>
                <div class="participants">
                    {#each meeting.participants as p}
                        <span class="participant-tag">{p}</span>
                    {/each}
                </div>
            </div>
            {/if}

            <!-- Objective Card -->
            {#if meeting.meeting_objective}
            <div class="card">
                <h3>🎯 Meeting Objective</h3>
                <p class="text-content">{meeting.meeting_objective}</p>
            </div>
            {/if}

            <!-- Agenda Card -->
            {#if meeting.agenda}
            <div class="card">
                <h3>📝 Agenda</h3>
                <p class="text-content">{meeting.agenda}</p>
            </div>
            {/if}

            <!-- Additional Info Card -->
            <div class="card">
                <h3>📎 Additional Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">🔔 Reminder</span>
                        <strong>{meeting.reminder_minutes} minutes before</strong>
                    </div>
                    {#if meeting.reference_no}
                    <div class="info-item">
                        <span class="label">📄 Reference No</span>
                        <strong>{meeting.reference_no}</strong>
                    </div>
                    {/if}
                    {#if meeting.attachment}
                    <div class="info-item">
                        <span class="label">📎 Attachment</span>
                        <strong>{meeting.attachment}</strong>
                    </div>
                    {/if}
                </div>
            </div>

            <!-- Actions -->
            <div class="actions">
                <button class="primary" on:click={() => goto(`/meeting/edit/${meeting.id}`)}>
                    ✏ Edit Meeting
                </button>
                <button class="secondary" on:click={() => goto(`/minutes/${meeting.id}`)}>
                    📝 Meeting Minutes
                </button>
                <button class="danger" on:click={() => goto("/meeting-list")}>
                    ← Back to List
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
.page { padding: 25px; max-width: 1200px; margin: auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.header h1 { margin: 0; font-size: 28px; color: #1e293b; }
.back-btn { padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.back-btn:hover { background: #475569; }

.loading, .error { text-align: center; padding: 60px; background: white; border-radius: 16px; }
.error h2 { color: #dc2626; margin-bottom: 10px; }

.details-grid { display: flex; flex-direction: column; gap: 20px; }
.card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 6px 18px rgba(0,0,0,.08); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; }
.card-header h2 { margin: 0; color: #1e293b; }
.card h3 { margin: 0 0 15px 0; color: #1e293b; font-size: 18px; }

.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.info-item { display: flex; flex-direction: column; gap: 5px; }
.info-item.full-width { grid-column: 1/3; }
.info-item .label { color: #64748b; font-size: 13px; font-weight: 600; }
.info-item strong { color: #1e293b; font-size: 15px; }
.link { color: #2563eb; text-decoration: none; word-break: break-all; }
.link:hover { text-decoration: underline; }

.badge { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; color: white; }
.badge.completed { background: #6b7280; }
.badge.today { background: #16a34a; }
.badge.upcoming { background: #2563eb; }
.badge.in-progress { background: #16a34a; }
.badge.overdue { background: #dc2626; }

.priority-low { color: #16a34a; }
.priority-medium { color: #ca8a04; }
.priority-high { color: #ea580c; }
.priority-critical { color: #dc2626; }

.participants { display: flex; flex-wrap: wrap; gap: 10px; }
.participant-tag { background: #dbeafe; color: #1d4ed8; padding: 8px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }

.text-content { color: #475569; line-height: 1.6; white-space: pre-wrap; }

.actions { display: flex; gap: 15px; }
button { cursor: pointer; border: none; border-radius: 10px; padding: 12px 24px; font-weight: 600; transition: .2s; }
button:hover { transform: translateY(-2px); }
.primary { background: #2563eb; color: white; }
.primary:hover { background: #1d4ed8; }
.secondary { background: #16a34a; color: white; }
.secondary:hover { background: #15803d; }
.danger { background: #dc2626; color: white; }
.danger:hover { background: #b91c1c; }

@media(max-width: 768px) {
    .info-grid { grid-template-columns: 1fr; }
    .info-item.full-width { grid-column: 1; }
    .header { flex-direction: column; align-items: flex-start; gap: 15px; }
    .actions { flex-direction: column; }
    .actions button { width: 100%; }
}
</style>