import { supabaseChat } from "$lib/supabase";

export async function loadContacts() {
    const { data, error } = await supabaseChat!
        .from("contacts")
        .select("*")
        .order("name");

    if (error) throw error;

    return data ?? [];
}

export async function loadGroups() {
    const { data, error } = await supabaseChat!
        .from("groups")
        .select("*")
        .order("name");

    if (error) throw error;

    return data ?? [];
}

export async function loadMessages(roomId: number) {
    const { data, error } = await supabaseChat!
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at");

    if (error) throw error;

    return data ?? [];
}