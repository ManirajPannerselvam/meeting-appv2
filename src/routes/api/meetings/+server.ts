import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from "$env/static/public";
import { env } from "$env/dynamic/private";

function getSupabase() {
    // Try service key first, fallback to anon (your current .env only has anon for chat)
    const serviceKey = env.SUPABASE_CHAT_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || PUBLIC_SUPABASE_CHAT_ANON_KEY;
    const url = PUBLIC_SUPABASE_CHAT_URL;

    if (!url) throw new Error("Missing PUBLIC_SUPABASE_CHAT_URL in .env");
    
    return createClient(url, serviceKey);
}

export const GET: RequestHandler = async () => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("meetings")
            .select("*")
            .order("meeting_date", { ascending: false })
            .order("start_time", { ascending: false });

        if (error) {
            console.error("Supabase meetings error:", error);
            return json({ error: error.message }, { status: 500 });
        }

        return json(data ?? []);
    } catch (err: any) {
        console.error("API meetings failed:", err);
        return json({ error: err.message }, { status: 500 });
    }
};