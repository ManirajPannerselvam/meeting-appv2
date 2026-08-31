<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { supabaseChat } from '$lib/supabase/client';
    import { addMeeting } from "$lib/stores/meetings"; // <-- USE STORE

    const supabase = supabaseChat;
    const GUEST_USER_ID = "guest-user-001";

    let currentUser: any = null;
    async function checkAuth() {
        currentUser = { id: GUEST_USER_ID, email: "guest@test.com", name: "Guest User", user_metadata: { name: "Guest User" } };
    }
    function getCurrentUserId() { return currentUser?.id?? GUEST_USER_ID; }

    let title = ""; let type = ""; let department = "Production"; let priority = "Medium";
    let date = ""; let start_time = ""; let end_time = ""; let location = ""; let organizer = "";
    let participants = ""; let agenda = ""; let meetingObjective = ""; let referenceNo = "";
    let meetingMode = "Offline"; let meetingLink = ""; let reminder = "15";
    let attachmentFile: File | null = null; let attachmentUrl = ""; let loading = false;

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
        const [h, m] = time.split(':'); const hour = parseInt(h); const ampm = hour >= 12? 'PM' : 'AM'; const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    }
    function generateReferenceNo() { const d = new Date(); referenceNo = `MTG-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(Date.now()).slice(-5)}`; }
    function clearForm() {
        title = ""; type = ""; department = "Production"; priority = "Medium"; date = ""; start_time = ""; end_time = ""; location = ""; organizer = ""; participants = ""; agenda = ""; meetingObjective = ""; meetingMode = "Offline"; meetingLink = ""; reminder = "15"; attachmentFile = null; attachmentUrl = ""; generateReferenceNo();
    }
    async function uploadAttachment(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]; if(!file) return; attachmentFile = file;
        const filename = `meetings/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("attachments").upload(filename, file);
        if(error) { alert("Upload failed: " + error.message); return; }
        const { data } = supabase.storage.from("attachments").getPublicUrl(filename); attachmentUrl = data.publicUrl;
    }
    async function validateForm() {
        if (!title.trim()) { alert("Please enter Meeting Title."); return false; }
        if (!type) { alert("Please select Meeting Type."); return false; }
        if (!date) { alert("Please select Meeting Date."); return false; }
        const today = new Date().toISOString().split("T")[0]; if (date < today) { alert("Meeting Date cannot be in the past."); return false; }
        if (!start_time) { alert("Please select Start Time."); return false; }
        if (!end_time) { alert("Please select End Time."); return false; }
        if (start_time >= end_time) { alert("End Time must be after Start Time."); return false; }
        if (!location.trim()) { alert("Please enter Meeting Location."); return false; }
        if (!organizer.trim()) { alert("Please enter Organizer."); return false; }
        if (meetingMode!== "Offline" &&!meetingLink.trim()) { alert("Meeting Link Required for Online/Hybrid meeting."); return false; }
        return true;
    }

    // FIXED SAVE - uses store so list reflects
    async function saveMeeting() {
        if (!await validateForm()) return;
        loading = true;
        try {
            const userId = getCurrentUserId();

            // duplicate check via supabase
            const { data: existing } = await supabase.from("meetings").select("id").eq("meeting_date", date).eq("start_time", start_time).eq("location", location).maybeSingle();
            if (existing) { alert("Meeting already exists at same time and location."); loading = false; return; }

            const payload = {
              title, type, department, priority,
              meeting_date: date, start_time, end_time,
              location, organizer, participants: participantArray,
              agenda, meeting_objective: meetingObjective,
              reference_no: referenceNo, meeting_mode: meetingMode,
              meeting_link: meetingMode === "Offline"? null : meetingLink,
              reminder_minutes: Number(reminder), attachment: attachmentUrl,
              created_by: userId, status: "scheduled",
              created_at: new Date().toISOString()
            };

            // USE STORE - this saves to Supabase + local + refreshes list
            const result = await addMeeting(payload);

            if (!result) throw new Error("Failed to save meeting");

            // trigger event for list page if open in other tab
            if(typeof window!== 'undefined'){
              window.dispatchEvent(new CustomEvent("meetings:updated"));
              localStorage.setItem('meetings_updated', Date.now().toString());
            }

            alert("✅ Meeting Created Successfully.");
            clearForm();
            goto("/meeting-list");
        } catch (err: any) {
            alert("Failed: " + (err.message || err));
            console.error(err);
        } finally {
            loading = false;
        }
    }
    onMount(async () => { await checkAuth(); generateReferenceNo(); });
</script>

<div class="page">
    <div class="page-header">
        <div class="title-block">
            <h1>📅Meeting</h1>
            <p>Create and schedule meetings</p>
        </div>
        <div class="header-actions">
            <button class="secondary" on:click={clearForm}>🔄 Reset</button>
            <button class="primary" on:click={saveMeeting} disabled={loading}>{#if loading} Saving... {:else} 💾 Save {/if}</button>
        </div>
    </div>

    <div class="dashboard">
        <div class="kpi blue"><div class="icon">📅</div><div><h2>{formattedDate}</h2><small>Date</small></div></div>
        <div class="kpi green"><div class="icon">🕒</div><div><h2>{formattedTime}</h2><small>Time</small></div></div>
        <div class="kpi orange"><div class="icon">🏢</div><div><h2>{department}</h2><small>Dept</small></div></div>
        <div class="kpi red"><div class="icon">⚠️</div><div><h2>{priority}</h2><small>Priority</small></div></div>
    </div>

    <div class="content">
        <div class="left-panel">
            <div class="card"><h2>📋 Meeting Info</h2><div class="form-grid"><div class="field"><label>Meeting Title *</label><input type="text" bind:value={title} placeholder="Enter title"/></div><div class="field"><label>Meeting Type *</label><select bind:value={type}><option value="">Select Type</option>{#each meetingTypes as item}<option value={item}>{item}</option>{/each}</select></div><div class="field"><label>Department</label><select bind:value={department}>{#each departments as item}<option value={item}>{item}</option>{/each}</select></div><div class="field"><label>Priority</label><select bind:value={priority}>{#each priorities as item}<option value={item}>{item}</option>{/each}</select></div></div></div>

            <div class="card"><h2>🗓 Schedule</h2><div class="form-grid"><div class="field"><label>Date *</label><input type="date" bind:value={date} min={new Date().toISOString().split('T')[0]} /></div><div class="field"><label>Start *</label><input type="time" bind:value={start_time} /></div><div class="field"><label>End *</label><input type="time" bind:value={end_time} /></div><div class="field"><label>Reminder</label><select bind:value={reminder}><option value="15">15 Min</option><option value="30">30 Min</option><option value="60">1 Hour</option></select></div></div></div>

            <div class="card"><h2>📍 Location</h2><div class="form-grid"><div class="field"><label>Mode</label><select bind:value={meetingMode}><option value="Offline">Offline</option><option value="Online">Online</option><option value="Hybrid">Hybrid</option></select></div><div class="field"><label>Location *</label><input type="text" bind:value={location} placeholder="Conference Room"/></div>{#if meetingMode!== "Offline"}<div class="field full"><label>Meeting Link *</label><input type="url" bind:value={meetingLink} placeholder="https://..."/></div>{/if}</div></div>

            <div class="card"><h2>👥 Organizer</h2><div class="form-grid"><div class="field"><label>Organizer *</label><input type="text" bind:value={organizer} placeholder="Name"/></div><div class="field"><label>Participants</label><input type="text" bind:value={participants} placeholder="a@b.com, c@d.com"/><small>Comma separated</small></div></div></div>

            <div class="card"><h2>🎯 Objective</h2><textarea rows="3" bind:value={meetingObjective} placeholder="Objective..."></textarea></div>
            <div class="card"><h2>📝 Agenda</h2><textarea rows="5" bind:value={agenda} placeholder="Agenda..."></textarea></div>
            <div class="card"><h2>📎 Attachment</h2><div class="form-grid"><div class="field"><label>Reference File</label><input type="file" on:change={uploadAttachment} />{#if attachmentUrl}<small class="ok">✅ Uploaded</small>{/if}</div><div class="field"><label>Ref No</label><input type="text" bind:value={referenceNo} readonly /></div></div></div>

            <div class="button-bar desktop-only">
                <button class="primary" on:click={saveMeeting}>💾 Save Meeting</button>
                <button class="secondary" type="button" on:click={clearForm}>🔄 Reset</button>
                <button class="danger" type="button" on:click={() => goto("/meeting-list")}>❌ Cancel</button>
            </div>
        </div>

        <div class="right-panel">
            <div class="summary-card"><h2>📊 Summary</h2><div class="summary-item"><span>Title</span><strong>{title || "-"}</strong></div><div class="summary-item"><span>Type</span><strong>{type || "-"}</strong></div><div class="summary-item"><span>Dept</span><strong>{department}</strong></div><div class="summary-item"><span>Priority</span><strong class={priority.toLowerCase()}>{priority}</strong></div><div class="summary-item"><span>Date</span><strong>{formattedDate}</strong></div><div class="summary-item"><span>Time</span><strong>{formattedTime}</strong></div><div class="summary-item"><span>Organizer</span><strong>{organizer || "-"}</strong></div><div class="summary-item"><span>Location</span><strong>{location || "-"}</strong></div><div class="summary-item"><span>Participants</span><strong>{participantCount}</strong></div></div>
            <div class="summary-card"><h2>📈 Progress</h2><div class="progress"><div class="progress-bar"><div class="progress-fill" style="width:{calculateProgress}%"></div></div><p>{calculateProgress}% Complete</p></div></div>
            <div class="summary-card sticky-save"><button class="save-big" on:click={saveMeeting}>💾 Save Meeting</button></div>
        </div>
    </div>

    <!-- MOBILE BOTTOM BAR -->
    <div class="mobile-bar">
        <button class="secondary" on:click={clearForm}>Reset</button>
        <button class="danger" on:click={() => goto("/meeting-list")}>Cancel</button>
        <button class="primary" on:click={saveMeeting} disabled={loading}>💾 Save</button>
    </div>
</div>

<style>
:global(html){ height:100%; overflow-y:auto; scroll-behavior:smooth; }
:global(body){ margin:0; font-family:Inter,Segoe UI,Arial,sans-serif; background:#eef3f8; height:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; }
:global(#svelte){ min-height:100%; overflow-y:auto; }

.page{ 
  padding:20px; 
  max-width:1700px; 
  margin:0 auto; 
  padding-bottom:110px; 
  min-height:100vh; 
  overflow-y:visible; 
  display:flex; 
  flex-direction:column; 
  gap:10px;
}
.page-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px; flex-wrap:wrap; position:sticky; top:0; z-index:10; background:#eef3f8; padding:10px 0; }
.title-block h1{ margin:0; font-size:28px; color:#1e293b; }.title-block p{ margin:6px 0 0; color:#64748b; font-size:13px; }
.header-actions{ display:flex; gap:8px; flex-wrap:nowrap; }
.dashboard{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:10px; flex-shrink:0; }
.kpi{ display:flex; align-items:center; gap:12px; color:white; padding:16px; border-radius:14px; box-shadow:0 6px 14px rgba(0,0,0,.08); }
.kpi h2{ margin:0; font-size:16px; }.kpi small{ opacity:.9; font-size:11px; }
.blue{background:#2563eb;}.green{background:#16a34a;}.orange{background:#ea580c;}.red{background:#dc2626;}
.content{ display:grid; grid-template-columns:1fr 340px; gap:20px; overflow:visible; align-items:start; }
.left-panel,.right-panel{ display:flex; flex-direction:column; gap:16px; overflow:visible; }
.card,.summary-card{ background:white; border-radius:14px; padding:18px; box-shadow:0 4px 14px rgba(0,0,0,.06); }
.card h2,.summary-card h2{ margin:0 0 14px; font-size:15px; color:#1e293b; }
.form-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
.field{ display:flex; flex-direction:column; gap:6px; }.field.full{ grid-column:1/-1; }
.field label{ font-weight:600; color:#475569; font-size:12px; }
input, select, textarea{ width:100%; padding:11px; border:1px solid #d1d5db; border-radius:9px; font-size:14px; box-sizing:border-box; }
small{ color:#64748b; font-size:11px; } small.ok{ color:#16a34a; font-weight:600; }
.button-bar{ display:flex; gap:10px; margin-top:10px; }
button{ cursor:pointer; border:none; border-radius:9px; padding:11px 16px; font-weight:600; font-size:13px; white-space:nowrap; }
.primary{ background:#2563eb; color:white; }.secondary{ background:#64748b; color:white; }.danger{ background:#dc2626; color:white; }
.save-big{ width:100%; padding:14px; background:#16a34a; color:white; font-size:16px; }
.summary-item{ display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #eef2f7; font-size:12px; }
.summary-item span{ color:#64748b; }.summary-item strong{ color:#1e293b; max-width:55%; text-align:right; overflow:hidden; text-overflow:ellipsis; }
.low{ color:#16a34a; }.medium{ color:#ca8a04; }.high{ color:#ea580c; }.critical{ color:#dc2626; }
.progress-bar{ width:100%; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin:12px 0; }.progress-fill{ height:100%; background:#16a34a; transition:width 0.3s; }
.mobile-bar{ display:none; }

@media (max-width: 900px) {
 .page{ padding:10px; padding-bottom:110px; height:auto; overflow-y:visible; }
 .page-header{ position:sticky; top:0; flex-direction:column; align-items:stretch; background:#eef3f8; }
 .header-actions{ display:flex; flex-direction:row; flex-wrap:nowrap; width:100%; gap:6px; }
 .header-actions button{ flex:1 1 0; min-height:42px; }
 .dashboard{ grid-template-columns:1fr 1fr; gap:10px; }
 .kpi{ padding:12px; gap:8px; }.kpi h2{ font-size:13px; }
 .content{ grid-template-columns:1fr; overflow:visible; }
 .right-panel{ order:-1; }
 .form-grid{ grid-template-columns:1fr; }
 .desktop-only{ display:none; }
 .mobile-bar{ 
   display:flex; position:fixed; bottom:0; left:0; right:0; 
   background:white; border-top:1px solid #e5e7eb; 
   padding:8px 10px; gap:8px; z-index:30; 
   box-shadow:0 -4px 12px rgba(0,0,0,.08);
   padding-bottom:calc(8px + env(safe-area-inset-bottom));
 }
 .mobile-bar button{ flex:1; min-height:44px; }
 .sticky-save{ display:none; }
 input, select, textarea{ font-size:16px; }
}
</style>