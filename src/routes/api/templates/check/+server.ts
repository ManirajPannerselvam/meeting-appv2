/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/routes/api/templates/check/+server.ts
 * ============================================================
 * PURPOSE
 *   Check if template is installed for a user mobile
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function GET({ url }: RequestEvent) {

    try {
        const mobile = url.searchParams.get("mobile");
        const templateIdParam = url.searchParams.get("templateId");

        if (!mobile || !templateIdParam) {
            return json(
                { success: false, error: 'mobile and templateId are required' },
                { status: 400 }
            );
        }

        const templateId = Number(templateIdParam);

        if (isNaN(templateId)) {
            return json(
                { success: false, error: 'templateId must be a number' },
                { status: 400 }
            );
        }

        const item = db.prepare(`
            SELECT id
            FROM installed_templates
            WHERE user_mobile = ?
            AND template_id = ?
        `).get(mobile, templateId);

        return json({
            success: true,
            installed: !!item
        });

    } catch (error) {
        console.error('[Templates Check API] Error:', error);
        return json(
            { success: false, error: 'Failed to check template' },
            { status: 500 }
        );
    }
}