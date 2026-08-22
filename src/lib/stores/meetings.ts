import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getMeetings, saveMeeting, deleteMeeting, getMeeting } from "$lib/db/database";

export const meetings = writable<any[]>([]);

export async function refreshMeetings(){
    if(!browser) return [];
    try{
        const data = await getMeetings();
        meetings.set(data);
        return data;
    } catch(err){
        console.error("refreshMeetings()", err);
        meetings.set([]);
        return [];
    }
}

export async function addMeeting(data:any){
    try{
        const result = await saveMeeting(data);
        await refreshMeetings();
        return result;
    } catch(err){
        console.error("addMeeting()", err);
        return null;
    }
}

export async function editMeeting(id:string | number, data:any){
    try{
        const result = await saveMeeting({ id: Number(id), ...data });
        await refreshMeetings();
        return result;
    } catch(err){
        console.error("editMeeting()", err);
        return null;
    }
}

export async function removeMeeting(id:string | number){
    try{
        await deleteMeeting(Number(id));
        await refreshMeetings();
        return true;
    } catch(err){
        console.error("removeMeeting()", err);
        return false;
    }
}

export async function getMeetingById(id:string | number){
    try{
        return await getMeeting(Number(id));
    } catch(err){
        console.error("getMeetingById()", err);
        return null;
    }
}

if(browser){
    window.addEventListener("meetings:updated", async()=>{
        await refreshMeetings();
    });
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