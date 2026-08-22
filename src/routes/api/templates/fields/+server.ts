/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/api/templates/fields/+server.ts
 * ============================================================
 * PURPOSE
 * Get all fields for a template from Tauri SQLite
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from "@sveltejs/kit";
import Database from "@tauri-apps/plugin-sql";

export async function GET({ url }: RequestEvent) {
    try {
        const templateId = url.searchParams.get("id");

        if (!templateId) {
            return json(
                { success: false, message: "Template id missing" },
                { status: 400 }
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
            WHERE template_id =?
            ORDER BY display_order
            `,
            [templateId]
        );

        return json({ success: true, data: fields });

    } catch (error) {
        console.error('[Template Fields API] Error:', error);
        return json(
            { success: false, message: 'Failed to load template fields' },
            { status: 500 }
        );
    }
}