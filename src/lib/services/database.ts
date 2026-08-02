import { supabaseChat } from "$lib/supabase";

const supabase = supabaseChat;

const GUEST_USER_ID = "guest-user-001";


// =====================================================
// AUTH
// =====================================================

function getCurrentUserId(){

    return GUEST_USER_ID;

}



// =====================================================
// MEETINGS
// =====================================================


export async function getMeetings(){

    const {
        data,
        error,
        status
    } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", {
            ascending:false
        })
        .order("start_time", {
            ascending:false
        });


    console.log(
        "Meetings status:",
        status
    );


    if(error){

        console.error(
            "Supabase meetings error:",
            error
        );

        throw new Error(
            error.message
        );

    }


    return data ?? [];

}



export async function getMeeting(
    id:number
){

    const {data,error}=await supabase
        .from("meetings")
        .select("*")
        .eq("id",id)
        .single();


    if(error){

        console.error(
            "getMeeting:",
            error
        );

        return null;

    }


    return data;

}




export async function addMeeting(
    data:any
){


    const now=new Date();


    const meetingDateTime =
        new Date(
            `${data.meeting_date}T${data.start_time || "00:00"}`
        );


    let status="scheduled";


    if(
        meetingDateTime.toDateString()
        === now.toDateString()
    ){

        status="today";

    }
    else if(
        meetingDateTime < now
    ){

        status="completed";

    }



    const payload={

        title:data.title,

        type:data.type,

        department:data.department,

        priority:data.priority,


        meeting_date:data.meeting_date,

        start_time:data.start_time,

        end_time:data.end_time,


        location:data.location,

        organizer:data.organizer,


        participants:
            Array.isArray(data.participants)
            ? data.participants
            : [],



        agenda:data.agenda,

        meeting_objective:
            data.meeting_objective,


        reference_no:
            data.reference_no,


        meeting_mode:
            data.meeting_mode,


        meeting_link:
            data.meeting_link,


        reminder_minutes:
            data.reminder_minutes ?? 15,


        attachment:
            data.attachment ?? "",


        status,

        created_by:
            getCurrentUserId()

    };



    const {error}=await supabase
        .from("meetings")
        .insert([payload]);



    if(error){

        console.error(
            "addMeeting:",
            error
        );

        throw error;

    }



    notifyUpdate();


    return true;

}





export async function updateMeeting(
    id:number,
    data:any
){


    const {error}=await supabase
        .from("meetings")
        .update(data)
        .eq("id",id);



    if(error){

        console.error(
            "updateMeeting:",
            error
        );

        throw error;

    }


    notifyUpdate();


    return true;

}





export async function deleteMeeting(
    id:number
){


    const {error}=await supabase
        .from("meetings")
        .delete()
        .eq("id",id);



    if(error){

        console.error(
            "deleteMeeting:",
            error
        );

        throw error;

    }


    notifyUpdate();


    return true;

}




function notifyUpdate(){

    if(
        typeof window !== "undefined"
    ){

        window.dispatchEvent(
            new CustomEvent(
                "meetings:updated"
            )
        );

    }

}



// =====================================================
// SIM INVENTORY
// Prisma handled by API
// =====================================================


export async function getSIMs(){

    const res =
        await fetch(
            "/api/sims"
        );


    if(!res.ok){

        throw new Error(
            "Failed to load SIMs"
        );

    }


    return await res.json();

}




export async function saveSIM(
    sim:any
){


    const res =
        await fetch(
            "/api/sims",
            {

                method:"POST",

                headers:{

                    "Content-Type":
                    "application/json"

                },

                body:
                    JSON.stringify(sim)

            }
        );



    if(!res.ok){

        throw new Error(
            "Failed to save SIM"
        );

    }


    return await res.json();

}



// =====================================================
// ANALYTICS
// =====================================================


export async function getAnalytics(){


    const [

        meetings,

        users,

        groups,

        messages


    ] = await Promise.all([


        supabase
        .from("meetings")
        .select("*",
        {
            count:"exact",
            head:true
        }),



        supabase
        .from("users")
        .select("*",
        {
            count:"exact",
            head:true
        }),



        supabase
        .from("chat_groups")
        .select("*",
        {
            count:"exact",
            head:true
        }),



        supabase
        .from("messages")
        .select("*",
        {
            count:"exact",
            head:true
        })

    ]);



    return {


        totalMeetings:
            meetings.count ?? 0,


        totalContacts:
            users.count ?? 0,


        totalGroups:
            groups.count ?? 0,


        totalMessages:
            messages.count ?? 0


    };

}



// =====================================================
// ACTIONS
// =====================================================


export async function getActions(){


    const {data,error}=await supabase
        .from("meeting_actions")
        .select("*");



    if(error){

        console.error(error);

        return [];

    }


    return data ?? [];

}



// =====================================================
// PRODUCTION REPORT
// =====================================================


export async function getProductionReport(){


    const {data,error}=await supabase
        .from("production_reports")
        .select("*");



    if(error){

        console.error(error);

        return [];

    }


    return data ?? [];

}



// =====================================================
// MACHINE DOWNTIME
// =====================================================


export async function getMachineDowntime(){


    const {data,error}=await supabase
        .from("machine_downtime")
        .select("*")
        .order(
            "report_date",
            {
                ascending:false
            }
        )
        .order(
            "created_at",
            {
                ascending:false
            }
        );



    if(error){

        console.error(
            "machine downtime:",
            error
        );

        return [];

    }


    return data ?? [];

}





export async function getMachineDowntimeById(
    id:number
){


    const {data,error}=await supabase
        .from("machine_downtime")
        .select("*")
        .eq("id",id)
        .single();



    if(error){

        return null;

    }


    return data;

}





export async function addMachineDowntime(
    item:any
){


    const {error}=await supabase
        .from("machine_downtime")
        .insert([item]);



    if(error){

        throw error;

    }


    return true;

}





export async function updateMachineDowntime(
    id:number,
    item:any
){


    const {error}=await supabase
        .from("machine_downtime")
        .update(item)
        .eq("id",id);



    if(error){

        throw error;

    }


    return true;

}





export async function deleteMachineDowntime(
    id:number
){


    const {error}=await supabase
        .from("machine_downtime")
        .delete()
        .eq("id",id);



    if(error){

        throw error;

    }


    return true;

}





export async function getTodayDowntime(){


    const today =
        new Date()
        .toISOString()
        .split("T")[0];



    const {data,error}=await supabase
        .from("machine_downtime")
        .select("*")
        .eq(
            "report_date",
            today
        );



    if(error){

        return [];

    }


    return data ?? [];

}