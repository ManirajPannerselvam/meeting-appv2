import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function GET() {

    const rows = db.prepare(`

        SELECT *

        FROM template_reports

        ORDER BY created_at DESC

    `).all();

    return json({

        reports: rows

    });

}