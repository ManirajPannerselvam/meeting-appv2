import { json } from "@sveltejs/kit";
import Database from "@tauri-apps/plugin-sql";

export async function GET({ url }) {

    const templateId = url.searchParams.get("id");

    if (!templateId) {

        return json(
            {
                message: "Template id missing"
            },
            {
                status: 400
            }
        );

    }

    const db = await Database.load("sqlite:meeting.db");

    const fields = await db.select(

        `

        SELECT

            field_name,

            field_label,

            field_type,

            placeholder,

            required,

            readonly,

            formula,

            default_value,

            display_order

        FROM template_fields

        WHERE template_id = ?

        ORDER BY display_order

        `,

        [templateId]

    );

    return json(fields);

}