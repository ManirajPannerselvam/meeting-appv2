import { json } from "@sveltejs/kit";
import { getDB } from "$lib/server/db";

export async function GET() {

    const db = getDB();

    try {

        const rows = db.prepare(`
            SELECT
                id,
                template_id,
                field_name,
                field_label,
                field_type,
                formula
            FROM template_fields
            ORDER BY template_id, display_order
        `).all();

        return json(rows);

    } catch (e: any) {

        return json(
            {
                error: e.message
            },
            {
                status: 500
            }
        );

    }

}