import { supabase } from "$lib/supabase";

// =====================================
// MEETINGS
// =====================================

export async function getMeetings() {
    const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("createdAt", { ascending: false });

    if (error) throw error;
    return data;
}

export async function getMeeting(id: number) {
    const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .single();

    if (error) return null;
    return data;
}

export async function addMeeting(data: any) {
    const { data: meeting, error } = await supabase
        .from("meetings")
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return meeting;
}

export async function updateMeeting(id: number, data: any) {
    const { data: meeting, error } = await supabase
        .from("meetings")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return meeting;
}

export async function deleteMeeting(id: number) {
    const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

// =====================================
// SIM INVENTORY
// =====================================

export async function getSIMs() {
    const { data, error } = await supabase
        .from("sim_inventory")
        .select("*")
        .order("createdAt", { ascending: false });

    if (error) throw error;
    return data;
}

export async function getSIM(id: string) {
    const { data, error } = await supabase
        .from("sim_inventory")
        .select("*")
        .eq("id", id)
        .single();

    if (error) return null;
    return data;
}

export async function saveSIM(sim: any) {
    const { data, error } = await supabase
        .from("sim_inventory")
        .insert({
            simNumber: sim.sim_number,
            operatorName: sim.operator_name,
            circle: sim.circle,
            planName: sim.plan_name,
            monthlyCost: Number(sim.monthly_cost ?? 0),
            assignedDevice: sim.assigned_device,
            owner: sim.owner,
            status: sim.status ?? "Available",
            remarks: sim.remarks
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateSIM(id: string, data: any) {
    const { data: sim, error } = await supabase
        .from("sim_inventory")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return sim;
}

export async function deleteSIM(id: string) {
    const { error } = await supabase
        .from("sim_inventory")
        .delete()
        .eq("id", id);

    if (error) throw error;
}