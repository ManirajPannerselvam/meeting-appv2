import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getMeetings, saveMeeting, deleteMeeting, getMeeting } from "$lib/db/database";
import { supabaseChat } from "$lib/supabase/client";

export const meetings = writable<any[]>([]);
export const meetingsLoading = writable(false);
const supabase = supabaseChat;

// READ
export async function refreshMeetings(){
  if(!browser) return [];
  meetingsLoading.set(true);
  try{
    const { data, error } = await supabase.from('meetings')
      .select('*')
      .order('meeting_date', { ascending:false })
      .order('id', { ascending:false });

    if(!error && data && data.length>0){
      meetings.set(data);
      // sync local async no await loop
      data.forEach(m=>saveMeeting(m).catch(()=>{}));
      return data;
    }
    // fallback local
    const local = await getMeetings();
    meetings.set(local||[]);
    return local||[];
  }catch(err){
    console.error("refreshMeetings",err);
    const local = await getMeetings().catch(()=>[]);
    meetings.set(local||[]);
    return local||[];
  }finally{
    meetingsLoading.set(false);
  }
}

// CREATE
export async function addMeeting(payload:any){
  try{
    const { data, error } = await supabase.from('meetings').insert(payload).select().single();
    if(error) throw error;
    await saveMeeting(data);
    await refreshMeetings();
    return data;
  }catch(err){
    console.warn("supabase insert failed, local fallback",err);
    const local = await saveMeeting(payload);
    await refreshMeetings();
    return local;
  }
}

// UPDATE - both names for compatibility
export async function editMeeting(id:string|number, data:any){
  return updateMeeting(id,data);
}

export async function updateMeeting(id:string|number, data:any){
  const numId = Number(id);
  try{
    const { data:result, error } = await supabase.from('meetings')
      .update({ ...data, updated_at:new Date().toISOString() })
      .eq('id', numId)
      .select().single();
    if(error) throw error;
    await saveMeeting(result);
    await refreshMeetings();
    return result;
  }catch(err){
    console.warn("supabase update failed, local fallback",err);
    const merged = { id:numId, ...data, updated_at:new Date().toISOString() };
    const local = await saveMeeting(merged);
    await refreshMeetings();
    return local;
  }
}

// DELETE
export async function removeMeeting(id:string|number){
  const numId = Number(id);
  try{ await supabase.from('meetings').delete().eq('id', numId); }catch{}
  await deleteMeeting(numId);
  await refreshMeetings();
  return true;
}

// GET ONE - try both string and number
export async function getMeetingById(id:string|number){
  const numId = Number(id);
  try{
    let { data } = await supabase.from('meetings').select('*').eq('id', numId).maybeSingle();
    if(data) return data;
    // try string id
    const { data:data2 } = await supabase.from('meetings').select('*').eq('id', id).maybeSingle();
    if(data2) return data2;
    return await getMeeting(numId) || await getMeeting(id as any);
  }catch{
    return await getMeeting(numId) || await getMeeting(id as any);
  }
}

// EVENTS
if(browser){
  window.addEventListener("meetings:updated", ()=>refreshMeetings());
  window.addEventListener("focus", ()=>refreshMeetings());
  window.addEventListener("storage", (e)=>{ if(e.key==="meetings_updated") refreshMeetings(); });
  refreshMeetings();
}

export default { meetings, meetingsLoading, refreshMeetings, addMeeting, editMeeting, updateMeeting, removeMeeting, getMeetingById };