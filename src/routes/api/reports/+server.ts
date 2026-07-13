import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export const GET = async () => {

    const rows = db.prepare(`
        SELECT 
            message_id,
            template_id,
            field_name,
            field_value,
            created_at
        FROM template_reports
        ORDER BY created_at DESC
    `).all();

    return json({
        success: true,
        reports: rows
    });

};