import { json } from "@sveltejs/kit";
import { supabase } from "$lib/supabase";

/* DELETE */
export async function DELETE({ params }) {
    try {
        const id = Number(params.id);

        const { error } = await supabase
            .from("meetings")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return json({ success: true });

    } catch (error) {
        console.error("DELETE meeting error:", error);

        return json(
            {
                success: false,
                error: "Failed to delete meeting"
            },
            {
                status: 500
            }
        );
    }
}

/* UPDATE */
export async function PUT({ params, request }) {
    try {
        const id = Number(params.id);

        const {
            title,
            date,
            type,
            agenda,
            location
        } = await request.json();

        const { error } = await supabase
            .from("meetings")
            .update({
                title,
                date,
                type,
                agenda,
                location
            })
            .eq("id", id);

        if (error) throw error;

        return json({ success: true });

    } catch (error) {
        console.error("UPDATE meeting error:", error);

        return json(
            {
                success: false,
                error: "Failed to update meeting"
            },
            {
                status: 500
            }
        );
    }
}