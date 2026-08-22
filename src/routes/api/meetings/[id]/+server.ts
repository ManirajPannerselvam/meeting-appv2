/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/routes/api/meetings/[id]/+server.ts
 * ============================================================
 * PURPOSE
 *   Meeting CRUD endpoints for single meeting
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from "@sveltejs/kit";
import { supabase } from "$lib/supabase";

type UpdateMeetingPayload = {
    title?: string;
    meeting_date?: string; // match your DB column name
    meeting_type?: string; 
    agenda?: string | null;
    location?: string;
}

/* DELETE */
export async function DELETE({ params }: RequestEvent) {
    try {
        const id = params.id;

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
            { status: 500 }
        );
    }
}

/* UPDATE */
export async function PUT({ params, request }: RequestEvent) {
    try {
        const id = params.id;

        const body = await request.json() as UpdateMeetingPayload;

        // Only send fields that are provided
        const updateData: Record<string, unknown> = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.meeting_date !== undefined) updateData.meeting_date = body.meeting_date;
        if (body.meeting_type !== undefined) updateData.meeting_type = body.meeting_type;
        if (body.agenda !== undefined) updateData.agenda = body.agenda;
        if (body.location !== undefined) updateData.location = body.location;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from("meetings")
            .update(updateData)
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
            { status: 500 }
        );
    }
}