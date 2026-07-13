import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function GET({ url }) {

    const mobile=url.searchParams.get("mobile");

    const templateId=Number(

        url.searchParams.get("templateId")

    );

    const item=db.prepare(`

        SELECT id

        FROM installed_templates

        WHERE

        user_mobile=?

        AND

        template_id=?

    `).get(

        mobile,

        templateId

    );

    return json({

        installed:!!item

    });

}