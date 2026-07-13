import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function POST({ request }) {

    const body = await request.json();

    db.prepare(`
        INSERT INTO template_reports
        (
            template_id,
            template_name,
            group_id,
            contact_id,
            sender,
            report_data
        )
        VALUES
        (?, ?, ?, ?, ?, ?)
    `).run(

        body.template.id,

        body.template.name,

        body.group,

        body.contact,

        "Admin",

        JSON.stringify(body.values)

    );

    return json({

        success: true

    });

}