import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getMeetings, saveMeeting, deleteMeeting, getMeeting } from "$lib/db/database";
import { supabaseChat } from "$lib/supabase/client";

export const meetings = writable<any[]>([]);

const supabase = supabaseChat;

// 1. READ = Try Supabase first (real), fallback to local DB
export async function refreshMeetings(){
    if(!browser) return [];
    try{
        // Try Supabase Chat DB - primary source
        const { data: sbData, error } = await supabase
            .from('meetings')
            .select('*')
            .order('meeting_date', { ascending: false })
            .order('id', { ascending: false });

        if(!error && sbData && sbData.length > 0){
            meetings.set(sbData);
            // also sync to local for offline
            try{ for(const m of sbData) await saveMeeting(m); }catch{}
            return sbData;
        }

        // Fallback to local IndexedDB if Supabase empty/error
        const localData = await getMeetings();
        meetings.set(localData || []);
        return localData || [];

    } catch(err){
        console.error("refreshMeetings()", err);
        try{
            const localData = await getMeetings();
            meetings.set(localData || []);
            return localData || [];
        }catch{
            meetings.set([]);
            return [];
        }
    }
}

// 2. ADD = Save to BOTH Supabase + local
export async function addMeeting(data:any){
    try{
        // save to supabase first
        if(data.id){
            const { data: result, error } = await supabase.from('meetings').upsert(data).select().single();
            if(error) throw error;
            await saveMeeting(result); // sync local
            await refreshMeetings();
            return result;
        } else {
            const { data: result, error } = await supabase.from('meetings').insert(data).select().single();
            if(error) throw error;
            await saveMeeting(result);
            await refreshMeetings();
            return result;
        }
    } catch(err){
        console.error("addMeeting() supabase failed, saving local", err);
        // fallback local only
        const result = await saveMeeting(data);
        await refreshMeetings();
        return result;
    }
}

export async function editMeeting(id:string | number, data:any){
    try{
        const payload = { id: Number(id), ...data };
        const { data: result, error } = await supabase.from('meetings').upsert(payload).select().single();
        if(error) throw error;
        await saveMeeting(result);
        await refreshMeetings();
        return result;
    } catch(err){
        console.error("editMeeting()", err);
        const result = await saveMeeting({ id: Number(id), ...data });
        await refreshMeetings();
        return result;
    }
}

export async function removeMeeting(id:string | number){
    try{
        await supabase.from('meetings').delete().eq('id', Number(id));
        await deleteMeeting(Number(id));
        await refreshMeetings();
        return true;
    } catch(err){
        console.error("removeMeeting()", err);
        await deleteMeeting(Number(id));
        await refreshMeetings();
        return true;
    }
}

export async function getMeetingById(id:string | number){
    try{
        // try supabase first
        const { data } = await supabase.from('meetings').select('*').eq('id', Number(id)).maybeSingle();
        if(data) return data;
        return await getMeeting(Number(id));
    } catch(err){
        console.error("getMeetingById()", err);
        return await getMeeting(Number(id));
    }
}

if(browser){
    window.addEventListener("meetings:updated", async()=>{
        await refreshMeetings();
    });
    // auto refresh on focus - so after you save and goto list, it refreshes
    window.addEventListener("focus", () => refreshMeetings());
    window.addEventListener("storage", () => refreshMeetings());
    refreshMeetings();
}

export default {
    meetings,
    refreshMeetings,
    addMeeting,
    editMeeting,
    removeMeeting,
    getMeetingById
};