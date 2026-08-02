import { writable } from "svelte/store";
import { browser } from "$app/environment";

import {
    getMeetings,
    addMeeting as dbAddMeeting,
    updateMeeting,
    deleteMeeting,
    getMeeting
} from "$lib/services/database";


export const meetings = writable<any[]>([]);


/* ==========================
   LOAD ALL MEETINGS
========================== */

export async function refreshMeetings(){

    if(!browser) return [];


    try{

        const data =
            await getMeetings();


        meetings.set(data);


        return data;


    }
    catch(err){

        console.error(
            "refreshMeetings()",
            err
        );


        meetings.set([]);


        return [];

    }

}




/* ==========================
   ADD
========================== */

export async function addMeeting(
    data:any
){

    try{


        const result =
            await dbAddMeeting(data);



        await refreshMeetings();



        return result;



    }
    catch(err){

        console.error(
            "addMeeting()",
            err
        );


        return null;

    }

}





/* ==========================
   UPDATE
========================== */

export async function editMeeting(
    id:string | number,
    data:any
){

    try{


        const result =
            await updateMeeting(
                Number(id),
                data
            );



        await refreshMeetings();



        return result;



    }
    catch(err){

        console.error(
            "editMeeting()",
            err
        );


        return null;

    }

}





/* ==========================
   DELETE
========================== */

export async function removeMeeting(
    id:string | number
){

    try{


        await deleteMeeting(
            Number(id)
        );


        await refreshMeetings();



        return true;



    }
    catch(err){

        console.error(
            "removeMeeting()",
            err
        );


        return false;

    }

}





/* ==========================
   GET BY ID
========================== */

export async function getMeetingById(
    id:string | number
){

    try{


        const data =
            await getMeeting(
                Number(id)
            );


        return data;



    }
    catch(err){

        console.error(
            "getMeetingById()",
            err
        );


        return null;

    }

}





/* ==========================
   AUTO REFRESH
========================== */


if(browser){


    window.addEventListener(
        "meetings:updated",
        async()=>{

            await refreshMeetings();

        }
    );



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