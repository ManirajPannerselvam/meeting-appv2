import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function POST({ request }) {

    const body = await request.json();

    db.prepare(`
        INSERT INTO installed_templates
        (
            template_code,
            template_id,
            template_version,
            template_name,
            installed_by,
            installed_date,
            last_update
        )
        VALUES
        (
            ?,?,?,?,?,datetime('now'),datetime('now')
        )
    `).run(

        body.template_code,

        body.template_id,

        body.version,

        body.name,

        body.user

    );

    return json({

        success:true

    });

}