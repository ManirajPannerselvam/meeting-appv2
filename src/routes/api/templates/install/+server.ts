/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/api/templates/install/+server.ts
 * ============================================================
 * PURPOSE
 * Install a template for a user
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

type InstallPayload = {
    template_code: string;
    template_id: number;
    version: string;
    name: string;
    user: string;
}

export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json() as InstallPayload;

        // basic validation
        if (!body.template_code || !body.template_id || !body.name || !body.user) {
            return json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

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
                ?, ?, ?, ?, datetime('now'), datetime('now')
            )
        `).run(
            body.template_code,
            body.template_id,
            body.version,
            body.name,
            body.user
        );

        return json({ success: true });

    } catch (error) {
        console.error('[Template Install API] Error:', error);
        return json(
            { success: false, error: 'Failed to install template' },
            { status: 500 }
        );
    }
}