import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient } from "@supabase/supabase-js";


const supabaseUrl =
    process.env.SUPABASE_CHAT_URL;


const supabaseKey =
    process.env.VITE_SUPABASE_CHAT_ANON_KEY;



if(!supabaseUrl){

    console.error(
        "Missing VITE_SUPABASE_CHAT_URL"
    );

}


if(!supabaseKey){

    console.error(
        "Missing VITE_SUPABASE_CHAT_ANON_KEY"
    );

}



const supabase =
    createClient(
        supabaseUrl!,
        supabaseKey!
    );




export const GET:RequestHandler = async()=>{


    try{


        const {
            data,
            error
        } =
        await supabase
        .from("meetings")
        .select("*")
        .order(
            "meeting_date",
            {
                ascending:false
            }
        )
        .order(
            "start_time",
            {
                ascending:false
            }
        );



        if(error){


            console.error(
                "Supabase meetings error:",
                error
            );


            return json(
                {
                    error:error.message
                },
                {
                    status:500
                }
            );

        }



        return json(
            data ?? []
        );


    }
    catch(err:any){


        console.error(
            "API meetings failed:",
            err
        );


        return json(
            {
                error:err.message
            },
            {
                status:500
            }
        );

    }


};