<script lang="ts">
    import { goto } from "$app/navigation";
    import { supabase } from '$lib/supabase';

    // ============================
    // Form Variables
    // ============================
    let title = "";
    let type = "";
    let department = "Production";
    let priority = "Medium";
    let date = "";
    let start_time = "";
    let end_time = "";
    let location = "";
    let organizer = "";
    let participants = "";
    let agenda = "";
    let meetingObjective = "";
    let referenceNo = "";
    let meetingMode = "Offline";
    let meetingLink = "";
    let reminder = "15";
    let attachment = "";
    let loading = false;

    // ============================
    // Dropdown Lists
    // ============================
    const meetingTypes = [
        "Daily", "Production", "Quality", "Engineering", 
        "Maintenance", "Customer", "Audit", "Management", 
        "Project", "Review"
    ];

    const departments = [
        "Production", "Quality", "Engineering", "Maintenance",
        "Warehouse", "Planning", "HR", "Admin", "Finance"
    ];

    const priorities = ["Low", "Medium", "High", "Critical"];

    // ============================
    // Format helpers for KPI cards
    // ============================
    $: formattedDate = date 
        ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : "--";
    
    $: formattedTime = start_time && end_time 
        ? `${formatTime(start_time)} - ${formatTime(end_time)}`
        : "--:-- - --:--";

    function formatTime(time: string) {
        if (!time) return "--:--";
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    }

    // ============================
    // Reset Form
    // ============================
    function calculateProgress() {
        let completed = 0;
        const total = 9;
        if(title) completed++;
        if(type) completed++;
        if(date) completed++;
        if(start_time) completed++;
        if(end_time) completed++;
        if(location) completed++;
        if(organizer) completed++;
        if(participants) completed++;
        if(agenda) completed++;
        return Math.round((completed / total) * 100);
    }

    function clearForm() {
        title = "";
        type = "";
        department = "Production";
        priority = "Medium";
        date = "";
        start_time = "";
        end_time = "";
        location = "";
        organizer = "";
        participants = "";
        agenda = "";
        meetingObjective = "";
        referenceNo = "";
        meetingMode = "Offline";
        meetingLink = "";
        reminder = "15";
        attachment = "";
    }

    // ============================
    // Validation
    // ============================
    function validateForm() {
        if (!title.trim()) {
            alert("Please enter Meeting Title.");
            return false;
        }
        if (!type) {
            alert("Please select Meeting Type.");
            return false;
        }
        if (!date) {
            alert("Please select Meeting Date.");
            return false;
        }
        if (!start_time) {
            alert("Please select Start Time.");
            return false;
        }
        if (!end_time) {
            alert("Please select End Time.");
            return false;
        }
        if (start_time >= end_time) {
            alert("End Time must be after Start Time.");
            return false;
        }
        if (!location.trim()) {
            alert("Please enter Meeting Location.");
            return false;
        }
        if (!organizer.trim()) {
            alert("Please enter Organizer.");
            return false;
        }
        return true;
    }

    // ============================
    // Save Meeting
    // ============================
    async function saveMeeting() {
        if (!validateForm()) return;

        loading = true;
        const userId = localStorage.getItem('userId');

        if (!userId) {
            alert("Please login first.");
            loading = false;
            return;
        }

        try {
            const { error } = await supabase.from('meetings').insert({
                title,
                type,
                department,
                priority,
                meeting_date: date,
                start_time: start_time,
                end_time: end_time,
                location,
                organizer,
                participants: participants.split(',').map(p => p.trim()).filter(Boolean),
                agenda,
                meeting_objective: meetingObjective,
                reference_no: referenceNo,
                meeting_mode: meetingMode,
                meeting_link: meetingLink,
                reminder_minutes: parseInt(reminder),
                attachment,
                created_by: userId,
                status: 'scheduled'
            });

            if (error) throw error;

            alert("✅ Meeting Created Successfully.");
            clearForm();
            goto("/meeting-list");
        } catch (err: any) {
            alert("Failed: " + err.message);
            console.error(err);
        } finally {
            loading = false;
        }
    }
</script>

<div class="page">
    <!-- HEADER -->
    <div class="page-header">
        <div>
            <h1>📅 EMS Meeting Management</h1>
            <p>Create and schedule production, quality and management meetings.</p>
        </div>
        <div class="header-actions">
            <button class="secondary" on:click={clearForm}>
                🔄 Reset
            </button>
            <button class="primary" on:click={saveMeeting} disabled={loading}>
                {#if loading}
                    Saving...
                {:else}
                    💾 Save Meeting
                {/if}
            </button>
        </div>
    </div>

    <!-- KPI CARDS - FIXED: All divs closed properly -->
    <div class="dashboard">
        <div class="kpi blue">
            <div class="icon">📅</div>
            <div>
                <h2>{formattedDate}</h2>
                <small>Meeting Date</small>
            </div>
        </div>
        <div class="kpi green">
            <div class="icon">🕒</div>
            <div>
                <h2>{formattedTime}</h2>
                <small>Meeting Time</small>
            </div>
        </div>
        <div class="kpi orange">
            <div class="icon">🏢</div>
            <div>
                <h2>{department}</h2>
                <small>Department</small>
            </div>
        </div>
        <div class="kpi red">
            <div class="icon">⚠️</div>
            <div>
                <h2>{priority}</h2>
                <small>Priority</small>
            </div>
        </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="content">
        <!-- LEFT PANEL -->
        <div class="left-panel">
            <!-- Meeting Information -->
            <div class="card">
                <h2>📋 Meeting Information</h2>
                <div class="form-grid">
                    <div class="field">
                        <label>Meeting Title *</label>
                        <input type="text" bind:value={title} placeholder="Production Daily Review" />
                    </div>
                    <div class="field">
                        <label>Meeting Type *</label>
                        <select bind:value={type}>
                            <option value="">Select Type</option>
                            {#each meetingTypes as item}
                                <option value={item}>{item}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="field">
                        <label>Department</label>
                        <select bind:value={department}>
                            {#each departments as item}
                                <option value={item}>{item}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="field">
                        <label>Priority</label>
                        <select bind:value={priority}>
                            {#each priorities as item}
                                <option value={item}>{item}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Schedule -->
            <div class="card">
                <h2>🗓 Meeting Schedule</h2>
                <div class="form-grid">
                    <div class="field">
                        <label>Meeting Date *</label>
                        <input type="date" bind:value={date} />
                    </div>
                    <div class="field">
                        <label>Start Time *</label>
                        <input type="time" bind:value={start_time} />
                    </div>
                    <div class="field">
                        <label>End Time *</label>
                        <input type="time" bind:value={end_time} />
                    </div>
                    <div class="field">
                        <label>Reminder</label>
                        <select bind:value={reminder}>
                            <option value="0">No Reminder</option>
                            <option value="5">5 Minutes</option>
                            <option value="10">10 Minutes</option>
                            <option value="15">15 Minutes</option>
                            <option value="30">30 Minutes</option>
                            <option value="60">1 Hour</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Meeting Location -->
            <div class="card">
                <h2>📍 Meeting Location</h2>
                <div class="form-grid">
                    <div class="field">
                        <label>Meeting Mode</label>
                        <select bind:value={meetingMode}>
                            <option value="Offline">Offline</option>
                            <option value="Online">Online</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Meeting Location *</label>
                        <input type="text" bind:value={location} placeholder="Conference Room A" />
                    </div>
                    {#if meetingMode !== "Offline"}
                    <div class="field" style="grid-column:1/3">
                        <label>Meeting Link</label>
                        <input type="text" bind:value={meetingLink} placeholder="Microsoft Teams / Zoom URL" />
                    </div>
                    {/if}
                </div>
            </div>

            <!-- Organizer & Participants -->
            <div class="card">
                <h2>👥 Organizer & Participants</h2>
                <div class="form-grid">
                    <div class="field">
                        <label>Organizer *</label>
                        <input type="text" bind:value={organizer} placeholder="Meeting Owner" />
                    </div>
                    <div class="field">
                        <label>Participants</label>
                        <input type="text" bind:value={participants} placeholder="Production, QA, PE, IE..." />
                        <small>Separate multiple names using commas.</small>
                    </div>
                </div>
            </div>

            <!-- Meeting Objective -->
            <div class="card">
                <h2>🎯 Meeting Objective</h2>
                <textarea
                    rows="4"
                    bind:value={meetingObjective}
                    placeholder="Example:
- Review yesterday production
- Analyze quality issues
- Discuss customer complaints
- Assign action items"
                ></textarea>
            </div>

            <!-- Agenda -->
            <div class="card">
                <h2>📝 Meeting Agenda</h2>
                <textarea rows="7" bind:value={agenda} placeholder="Meeting Agenda..."></textarea>
            </div>

            <!-- Attachment -->
            <div class="card">
                <h2>📎 Attachment</h2>
                <div class="form-grid">
                    <div class="field">
                        <label>Reference File</label>
                        <input type="text" bind:value={attachment} placeholder="Production_Report.xlsx" />
                    </div>
                    <div class="field">
                        <label>Reference Number</label>
                        <input type="text" bind:value={referenceNo} placeholder="DOC-2026-001" />
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="button-bar">
                <button class="primary" on:click={saveMeeting}>💾 Save Meeting</button>
                <button class="secondary" type="button" on:click={clearForm}>🔄 Reset</button>
                <button class="danger" type="button" on:click={() => goto("/meetings/list")}>❌ Cancel</button>
            </div>
        </div>

        <!-- RIGHT PANEL -->
        <div class="right-panel">
            <div class="summary-card">
                <h2>📊 Meeting Summary</h2>
                <div class="summary-item">
                    <span>Meeting Title</span>
                    <strong>{title || "-"}</strong>
                </div>
                <div class="summary-item">
                    <span>Meeting Type</span>
                    <strong>{type || "-"}</strong>
                </div>
                <div class="summary-item">
                    <span>Department</span>
                    <strong>{department}</strong>
                </div>
                <div class="summary-item">
                    <span>Priority</span>
                    <strong class={priority.toLowerCase()}>{priority}</strong>
                </div>
                <div class="summary-item">
                    <span>Date</span>
                    <strong>{formattedDate}</strong>
                </div>
                <div class="summary-item">
                    <span>Time</span>
                    <strong>{formattedTime}</strong>
                </div>
                <div class="summary-item">
                    <span>Organizer</span>
                    <strong>{organizer || "-"}</strong>
                </div>
                <div class="summary-item">
                    <span>Location</span>
                    <strong>{location || "-"}</strong>
                </div>
                <div class="summary-item">
                    <span>Participants</span>
                    <strong>{participants || "-"}</strong>
                </div>
            </div>

            <div class="summary-card">
                <h2>📈 Meeting Progress</h2>
                <div class="progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:{calculateProgress()}%"></div>
                    </div>
                    <p>{calculateProgress()}% Complete</p>
                </div>
            </div>

            <div class="summary-card">
                <h2>⚡ Quick Information</h2>
                <ul>
                    <li>📅 Date : {formattedDate}</li>
                    <li>🕒 Start : {formatTime(start_time)}</li>
                    <li>🕒 End : {formatTime(end_time)}</li>
                    <li>🏢 Department : {department}</li>
                    <li>⚠ Priority : {priority}</li>
                    <li>👤 Organizer : {organizer || "-"}</li>
                </ul>
            </div>

            <div class="summary-card">
                <button class="save-big" on:click={saveMeeting}>💾 Save Meeting</button>
            </div>
        </div>
    </div>
</div>

<style>
:global(body){
    margin:0;
    font-family:Inter,Segoe UI,Arial,sans-serif;
    background:#eef3f8;
}
.page{ padding:25px; max-width:1700px; margin:auto; }
.page-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; }
.page-header h1{ margin:0; font-size:32px; color:#1e293b; }
.page-header p{ margin-top:8px; color:#64748b; }
.header-actions{ display:flex; gap:15px; }
.dashboard{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-bottom:25px; }
.kpi{ display:flex; align-items:center; gap:18px; color:white; padding:22px; border-radius:16px; box-shadow:0 8px 20px rgba(0,0,0,.08); }
.kpi .icon{ font-size:34px; }
.kpi h2{ margin:0; font-size:24px; }
.kpi small{ opacity:.9; }
.blue{background:#2563eb;} .green{background:#16a34a;} .orange{background:#ea580c;} .red{background:#dc2626;}
.content{ display:grid; grid-template-columns:1fr 340px; gap:25px; }
.left-panel, .right-panel{ display:flex; flex-direction:column; gap:20px; }
.card, .summary-card{ background:white; border-radius:16px; padding:22px; box-shadow:0 6px 18px rgba(0,0,0,.08); }
.card h2, .summary-card h2{ margin-top:0; color:#1e293b; margin-bottom:18px; }
.form-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
.field{ display:flex; flex-direction:column; gap:8px; }
.field label{ font-weight:600; color:#475569; }
input, select, textarea{ width:100%; padding:12px; border:1px solid #d1d5db; border-radius:10px; font-size:14px; transition:.2s; box-sizing:border-box; }
input:focus, select:focus, textarea:focus{ outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15); }
textarea{ resize:vertical; }
.button-bar{ display:flex; gap:15px; margin-top:10px; }
button{ cursor:pointer; border:none; border-radius:10px; padding:12px 20px; font-weight:600; transition:.25s; }
button:hover{ transform:translateY(-2px); }
.primary{ background:#2563eb; color:white; }
.primary:hover{ background:#1d4ed8; }
.secondary{ background:#64748b; color:white; }
.secondary:hover{ background:#475569; }
.danger{ background:#dc2626; color:white; }
.danger:hover{ background:#b91c1c; }
.save-big{ width:100%; padding:15px; background:#16a34a; color:white; font-size:18px; }
.summary-item{ display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #e5e7eb; }
.summary-item span{ color:#64748b; }
.low{ color:#16a34a; } .medium{ color:#ca8a04; } .high{ color:#ea580c; } .critical{ color:#dc2626; }
.progress{ text-align:center; }
.progress-bar{ width:100%; height:12px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin:15px 0; }
.progress-fill{ height:100%; background:#16a34a; transition:.4s; }
.summary-card ul{ padding-left:18px; margin:0; }
.summary-card li{ margin:12px 0; color:#475569; }
small{ color:#64748b; }

@media(max-width:1200px){ 
    .dashboard{ grid-template-columns:repeat(2,1fr); }
    .content{ grid-template-columns:1fr; }
}
@media(max-width:700px){ 
    .dashboard{ grid-template-columns:1fr; }
    .form-grid{ grid-template-columns:1fr; }
    .page-header{ flex-direction:column; align-items:flex-start; gap:20px; }
    .button-bar{ flex-direction:column; }
    .header-actions{ width:100%; }
    .header-actions button{ width:100%; }
}
</style>