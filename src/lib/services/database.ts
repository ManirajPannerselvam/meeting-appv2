import { supabaseChat } from "$lib/supabase"; // meetings are in chatDB

const supabase = supabaseChat;

const GUEST_USER_ID = "guest-user-001";

// Helper to match your existing chat auth
function getCurrentUserId() {
    return GUEST_USER_ID;
}

/* ==========================
MEETINGS - GET ALL
========================== */
export async function getMeetings() {
    const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false })
        .order("start_time", { ascending: false });

    if (error) {
        console.error("getMeetings error:", error);
        throw error;
    }
    return data || []; // Return supabase rows directly. No remapping
}

/* ==========================
MEETINGS - GET ONE
========================== */
export async function getMeeting(id: number) {
    const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("getMeeting error:", error);
        return null;
    }
    return data;
}

/* ==========================
MEETINGS - ADD
========================== */
export async function addMeeting(data: any) {
    const userId = getCurrentUserId();

    // Calculate status
    const now = new Date();
    const meetingDateTime = new Date(`${data.meeting_date}T${data.start_time || "00:00"}`);
    let status = "Scheduled";
    if (meetingDateTime.toDateString() === now.toDateString()) {
        status = "Today";
    } else if (meetingDateTime < now) {
        status = "Completed";
    }

    const payload = {
    title: data.title,
    type: data.type,
    department: data.department,
    priority: data.priority,

    meeting_date: data.meeting_date,
    start_time: data.start_time,
    end_time: data.end_time,

    location: data.location,
    organizer: data.organizer,
    participants: data.participants,

    agenda: data.agenda,
    meeting_objective: data.meeting_objective,

    reference_no: data.reference_no,
    meeting_mode: data.meeting_mode,
    meeting_link: data.meeting_link,

    reminder_minutes: data.reminder_minutes,
    attachment: data.attachment,

    status,
    created_by: userId
};

    const { error } = await supabase.from("meetings").insert([payload]);

    if (error) {
        console.error("addMeeting error:", error);
        throw error;
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("meetings:updated"));
    }
    return true;
}

/* ==========================
MEETINGS - UPDATE
========================== */
export async function updateMeeting(id: number, data: any) {
    const { error } = await supabase
        .from("meetings")
        .update(data)
        .eq("id", id);

    if (error) {
        console.error("updateMeeting error:", error);
        throw error;
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("meetings:updated"));
    }
    return true;
}

/* ==========================
MEETINGS - DELETE
========================== */
export async function deleteMeeting(id: number) {
    const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("deleteMeeting error:", error);
        throw error;
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("meetings:updated"));
    }
    return true;
}

/* ==========================
ANALYTICS - NOW USES SUPABASE
========================== */
export async function getAnalytics() {
    const [meetings, users, groups, messages] = await Promise.all([
        supabase.from('meetings').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('chat_groups').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true })
    ]);

    return {
        totalMeetings: meetings.count ?? 0,
        totalContacts: users.count ?? 0,
        totalGroups: groups.count ?? 0,
        totalMessages: messages.count ?? 0
    };
}

/* ==========================
MEETING ACTIONS
========================== */

export async function getActions() {

    const { data, error, status } = await supabase
        .from("meeting_actions")
        .select("*");

    console.log("Actions Status:", status);
    console.log("Actions Error:", error);
    console.table(data);

    return data ?? [];
}

/* ==========================
PRODUCTION REPORTS
========================== */

export async function getProductionReport() {

    const { data, error, status } = await supabase
        .from("production_reports")
        .select("*");

    console.log("Production Status:", status);
    console.log("Production Error:", error);
    console.table(data);

    return data ?? [];
}

/* ============================================================
   MACHINE DOWNTIME
============================================================ */

export async function getMachineDowntime() {

    const { data, error } = await supabase
        .from("machine_downtime")
        .select("*")
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {

        console.error("getMachineDowntime()", error);

        return [];

    }

    return data ?? [];

}

export async function getMachineDowntimeById(id:number){

    const { data,error } = await supabase
        .from("machine_downtime")
        .select("*")
        .eq("id",id)
        .single();

    if(error){

        console.error(error);

        return null;

    }

    return data;

}

export async function addMachineDowntime(item:any){

    const { error } = await supabase
        .from("machine_downtime")
        .insert([item]);

    if(error){

        console.error(error);

        throw error;

    }

    return true;

}

export async function updateMachineDowntime(id:number,item:any){

    const { error } = await supabase
        .from("machine_downtime")
        .update(item)
        .eq("id",id);

    if(error){

        console.error(error);

        throw error;

    }

    return true;

}

export async function deleteMachineDowntime(id:number){

    const { error } = await supabase
        .from("machine_downtime")
        .delete()
        .eq("id",id);

    if(error){

        console.error(error);

        throw error;

    }

    return true;

}

/* Today's downtime */

export async function getTodayDowntime(){

    const today = new Date().toISOString().split("T")[0];

    const { data,error } = await supabase
        .from("machine_downtime")
        .select("*")
        .eq("report_date",today);

    if(error){

        console.error(error);

        return [];

    }

    return data ?? [];

}