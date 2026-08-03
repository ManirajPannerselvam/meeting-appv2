import { supabase } from "$lib/supabase";

export async function getMeetings() {
    const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("createdAt", { ascending: false });

    if (error) throw error;
    return data;
}

export async function createMeeting(data: any) {
    const { data: meeting, error } = await supabase
        .from("meetings")
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return meeting;
}