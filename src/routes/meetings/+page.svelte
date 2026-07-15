<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { supabaseChat } from '$lib/supabase'; // meetings in chatDB

    const supabase = supabaseChat;
    const GUEST_USER_ID = "guest-user-001"; // FIX 1: same as chat

    // ============================
    // Auth State - Copied from Chat
    // ============================
    let currentUser: any = null;

    async function checkAuth() { // FIX 1
        currentUser = {
            id: GUEST_USER_ID,
            email: "guest@test.com",
            name: "Guest User",
            user_metadata: { name: "Guest User" }
        };
    }

    function getCurrentUserId() { // FIX 1
        return currentUser?.id?? GUEST_USER_ID;
    }

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
    let attachmentFile: File | null = null;
    let attachmentUrl = "";
    let loading = false;

    const meetingTypes = ["Daily", "Production", "Quality", "Engineering", "Maintenance", "Customer", "Audit", "Management", "Project", "Review"];
    const departments = ["Production", "Quality", "Engineering", "Maintenance", "Warehouse", "Planning", "HR", "Admin", "Finance"];
    const priorities = ["Low", "Medium", "High", "Critical"];

    $: formattedDate = date? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "--";
    $: formattedTime = start_time && end_time? `${formatTime(start_time)} - ${formatTime(end_time)}` : "--:-- - --:--";
    $: participantArray = participants.split(",").map(p => p.trim()).filter(Boolean);
    $: participantCount = participantArray.length;
    $: requiredFields = [title, type, date, start_time, end_time, location, organizer, participants, agenda];
    $: calculateProgress = Math.round(requiredFields.filter(v => String(v).trim()).length / requiredFields.length * 100);

    function formatTime(time: string) {
        if (!time) return "--:--";
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    }

    function generateReferenceNo() {
        const d = new Date();
        referenceNo = `MTG-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(Date.now()).slice(-5)}`;
    }

    function clearForm() {
        title = ""; type = ""; department = "Production"; priority = "Medium"; date = "";
        start_time = ""; end_time = ""; location = ""; organizer = ""; participants = "";
        agenda = ""; meetingObjective = ""; meetingMode = "Offline"; meetingLink = "";
        reminder = "15"; attachmentFile = null; attachmentUrl = "";
        generateReferenceNo();
    }

    async function uploadAttachment(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if(!file) return;
        attachmentFile = file;
        const filename = `meetings/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("attachments").upload(filename, file);
        if(error) { alert("Upload failed: " + error.message); return; }
        const { data } = supabase.storage.from("attachments").getPublicUrl(filename);
        attachmentUrl = data.publicUrl;
    }

    async function validateForm() {
        if (!title.trim()) { alert("Please enter Meeting Title."); return false; }
        if (!type) { alert("Please select Meeting Type."); return false; }
        if (!date) { alert("Please select Meeting Date."); return false; }
        const today = new Date().toISOString().split("T")[0];
        if (date < today) { alert("Meeting Date cannot be in the past."); return false; }
        if (!start_time) { alert("Please select Start Time."); return false; }
        if (!end_time) { alert("Please select End Time."); return false; }
        if (start_time >= end_time) { alert("End Time must be after Start Time."); return false; }
        if (!location.trim()) { alert("Please enter Meeting Location."); return false; }
        if (!organizer.trim()) { alert("Please enter Organizer."); return false; }
        if (meetingMode!== "Offline" &&!meetingLink.trim()) {
            alert("Meeting Link Required for Online/Hybrid meeting.");
            return false;
        }
        return true;
    }

    // ============================
    // Save Meeting - FIX 2 + 3
    // ============================
    async function saveMeeting() {
        if (!await validateForm()) return;
        loading = true;

        try {
            const userId = getCurrentUserId(); // FIX 2: Use guest auth

            // Duplicate Check
            const { data: existing } = await supabase.from("meetings")
              .select("id")
              .eq("meeting_date", date)
              .eq("start_time", start_time)
              .eq("location", location)
              .maybeSingle();
            if (existing) { alert("Meeting already exists at same time and location."); loading = false; return; }

            const payload = { // FIX 3
                title,
                type,
                department,
                priority,
                meeting_date: date,
                start_time,
                end_time,
                location,
                organizer,
                participants: participantArray,
                agenda,
                meeting_objective: meetingObjective,
                reference_no: referenceNo,
                meeting_mode: meetingMode,
                meeting_link: meetingMode === "Offline"? null : meetingLink,
                reminder_minutes: Number(reminder),
                attachment: attachmentUrl,
                created_by: userId, // FIX 2
                status: "scheduled"
            };

            const { error } = await supabase.from("meetings").insert(payload);
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

    onMount(async () => { // FIX 1
        await checkAuth();
        generateReferenceNo();
    });
</script>

<!-- HTML and CSS stays same as previous version -->
<div class="page">
    <div class="page-header">
        <div>
            <h1>📅 EMS Meeting Management</h1>
            <p>Create and schedule production, quality and management meetings.</p>
        </div>
        <div class="header-actions">
            <button class="secondary" on:click={clearForm}>🔄 Reset</button>
            <button class="primary" on:click={saveMeeting} disabled={loading}>
                {#if loading} Saving... {:else} 💾 Save Meeting {/if}
            </button>
        </div>
    </div>

    <div class="dashboard">
        <div class="kpi blue"><div class="icon">📅</div><div><h2>{formattedDate}</h2><small>Meeting Date</small></div></div>
        <div class="kpi green"><div class="icon">🕒</div><div><h2>{formattedTime}</h2><small>Meeting Time</small></div></div>
        <div class="kpi orange"><div class="icon">🏢</div><div><h2>{department}</h2><small>Department</small></div></div>
        <div class="kpi red"><div class="icon">⚠️</div><div><h2>{priority}</h2><small>Priority</small></div></div>
    </div>

    <div class="content">
        <div class="left-panel">
            <div class="card">
                <h2>📋 Meeting Information</h2>
                <div class="form-grid">
                    <div class="field"><label>Meeting Title *</label><input type="text" bind:value={title} /></div>
                    <div class="field"><label>Meeting Type *</label><select bind:value={type}><option value="">Select Type</option>{#each meetingTypes as item}<option value={item}>{item}</option>{/each}</select></div>
                    <div class="field"><label>Department</label><select bind:value={department}>{#each departments as item}<option value={item}>{item}</option>{/each}</select></div>
                    <div class="field"><label>Priority</label><select bind:value={priority}>{#each priorities as item}<option value={item}>{item}</option>{/each}</select></div>
                </div>
            </div>

            <div class="card">
                <h2>🗓 Meeting Schedule</h2>
                <div class="form-grid">
                    <div class="field"><label>Meeting Date *</label><input type="date" bind:value={date} min={new Date().toISOString().split('T')[0]} /></div>
                    <div class="field"><label>Start Time *</label><input type="time" bind:value={start_time} /></div>
                    <div class="field"><label>End Time *</label><input type="time" bind:value={end_time} /></div>
                    <div class="field"><label>Reminder</label><select bind:value={reminder}><option value="15">15 Minutes</option></select></div>
                </div>
            </div>

            <div class="card">
                <h2>📍 Meeting Location</h2>
                <div class="form-grid">
                    <div class="field"><label>Meeting Mode</label><select bind:value={meetingMode}><option value="Offline">Offline</option><option value="Online">Online</option><option value="Hybrid">Hybrid</option></select></div>
                    <div class="field"><label>Meeting Location *</label><input type="text" bind:value={location} /></div>
                    {#if meetingMode!== "Offline"}<div class="field" style="grid-column:1/3"><label>Meeting Link *</label><input type="url" bind:value={meetingLink} /></div>{/if}
                </div>
            </div>

            <div class="card">
                <h2>👥 Organizer & Participants</h2>
                <div class="form-grid">
                    <div class="field"><label>Organizer *</label><input type="text" bind:value={organizer} /></div>
                    <div class="field"><label>Participants</label><input type="text" bind:value={participants} /><small>Separate multiple names using commas.</small></div>
                </div>
            </div>

            <div class="card">
                <h2>🎯 Meeting Objective</h2><textarea rows="4" bind:value={meetingObjective}></textarea>
            </div>
            <div class="card">
                <h2>📝 Meeting Agenda</h2><textarea rows="7" bind:value={agenda}></textarea>
            </div>
            <div class="card">
                <h2>📎 Attachment</h2>
                <div class="form-grid">
                    <div class="field"><label>Reference File</label><input type="file" on:change={uploadAttachment} />{#if attachmentUrl}<small>✅ Uploaded</small>{/if}</div>
                    <div class="field"><label>Reference Number</label><input type="text" bind:value={referenceNo} readonly /></div>
                </div>
            </div>

            <div class="button-bar">
                <button class="primary" on:click={saveMeeting}>💾 Save Meeting</button>
                <button class="secondary" type="button" on:click={clearForm}>🔄 Reset</button>
                <button class="danger" type="button" on:click={() => goto("/meeting-list")}>❌ Cancel</button>
            </div>
        </div>

        <div class="right-panel">
            <div class="summary-card">
                <h2>📊 Meeting Summary</h2>
                <div class="summary-item"><span>Meeting Title</span><strong>{title || "-"}</strong></div>
                <div class="summary-item"><span>Meeting Type</span><strong>{type || "-"}</strong></div>
                <div class="summary-item"><span>Department</span><strong>{department}</strong></div>
                <div class="summary-item"><span>Priority</span><strong class={priority.toLowerCase()}>{priority}</strong></div>
                <div class="summary-item"><span>Date</span><strong>{formattedDate}</strong></div>
                <div class="summary-item"><span>Time</span><strong>{formattedTime}</strong></div>
                <div class="summary-item"><span>Organizer</span><strong>{organizer || "-"}</strong></div>
                <div class="summary-item"><span>Location</span><strong>{location || "-"}</strong></div>
                <div class="summary-item"><span>Participants</span><strong>{participantCount} Members</strong></div>
            </div>

            <div class="summary-card">
                <h2>📈 Meeting Progress</h2>
                <div class="progress">
                    <div class="progress-bar"><div class="progress-fill" style="width:{calculateProgress}%"></div></div>
                    <p>{calculateProgress}% Complete</p>
                </div>
            </div>

            <div class="summary-card">
                <button class="save-big" on:click={saveMeeting}>💾 Save Meeting</button>
            </div>
        </div>
    </div>
</div>

<style>
:global(body){ margin:0; font-family:Inter,Segoe UI,Arial,sans-serif; background:#eef3f8; }
.page{ padding:25px; max-width:1700px; margin:auto; }
.page-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; }
.page-header h1{ margin:0; font-size:32px; color:#1e293b; }
.page-header p{ margin-top:8px; color:#64748b; }
.header-actions{ display:flex; gap:15px; }
.dashboard{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-bottom:25px; }
.kpi{ display:flex; align-items:center; gap:18px; color:white; padding:22px; border-radius:16px; box-shadow:0 8px 20px rgba(0,0,0,.08); }
.kpi.icon{ font-size:34px; }.kpi h2{ margin:0; font-size:24px; }.kpi small{ opacity:.9; }
.blue{background:#2563eb;}.green{background:#16a34a;}.orange{background:#ea580c;}.red{background:#dc2626;}
.content{ display:grid; grid-template-columns:1fr 340px; gap:25px; }
.left-panel,.right-panel{ display:flex; flex-direction:column; gap:20px; }
.card,.summary-card{ background:white; border-radius:16px; padding:22px; box-shadow:0 6px 18px rgba(0,0,0,.08); }
.card h2,.summary-card h2{ margin-top:0; color:#1e293b; margin-bottom:18px; }
.form-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
.field{ display:flex; flex-direction:column; gap:8px; }
.field label{ font-weight:600; color:#475569; }
input, select, textarea{ width:100%; padding:12px; border:1px solid #d1d5db; border-radius:10px; font-size:14px; box-sizing:border-box; }
.button-bar{ display:flex; gap:15px; margin-top:10px; }
button{ cursor:pointer; border:none; border-radius:10px; padding:12px 20px; font-weight:600; }
.primary{ background:#2563eb; color:white; }.secondary{ background:#64748b; color:white; }.danger{ background:#dc2626; color:white; }
.save-big{ width:100%; padding:15px; background:#16a34a; color:white; font-size:18px; }
.summary-item{ display:flex; justify-content:space-between; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #e5e7eb; }
.low{ color:#16a34a; }.medium{ color:#ca8a04; }.high{ color:#ea580c; }.critical{ color:#dc2626; }
.progress-bar{ width:100%; height:12px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin:15px 0; }.progress-fill{ height:100%; background:#16a34a; }
</style>