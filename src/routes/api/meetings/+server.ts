import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient } from "@supabase/supabase-js";
import {
    SUPABASE_CHAT_URL,
    SUPABASE_CHAT_SERVICE_KEY
} from "$env/static/private";

const supabase = createClient(
    SUPABASE_CHAT_URL,
    SUPABASE_CHAT_SERVICE_KEY
);

export const GET: RequestHandler = async () => {
    try {
        const { data, error } = await supabase
            .from("meetings")
            .select("*")
            .order("meeting_date", { ascending: false })
            .order("start_time", { ascending: false });

        if (error) {
            console.error("Supabase meetings error:", error);

            return json(
                { error: error.message },
                { status: 500 }
            );
        }

        return json(data ?? []);

    } catch (err: any) {
        console.error("API meetings failed:", err);

        return json(
            { error: err.message },
            { status: 500 }
        );
    }
};