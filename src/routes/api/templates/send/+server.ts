import { json, error } from "@sveltejs/kit";
import db from "$lib/server/db";
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();

        // Validation
        if (!body.reportId ||!body.templateId ||!body.sender) {
            throw error(400, 'Missing required fields: reportId, templateId, sender');
        }

        if (!body.groupId &&!body.contactId) {
            throw error(400, 'Either groupId or contactId required');
        }

        // Use transaction - both inserts succeed or both fail
        const result = db.transaction(() => {
            /* Create normal chat message */
            const message = db.prepare(`
                INSERT INTO messages
                (group_id, contact_id, sender, message, type)
                VALUES (?,?,?,?,?)
            `).run(
                body.groupId?? null,
                body.contactId?? null,
                body.sender,
                `[TEMPLATE:${body.reportId}]`,
                "template"
            );

            /* Link report with message */
            db.prepare(`
                INSERT INTO template_messages
                (message_id, report_id, template_id)
                VALUES (?,?,?)
            `).run(
                message.lastInsertRowid,
                body.reportId,
                body.templateId
            );

            return message.lastInsertRowid;
        })();

        return json({
            success: true,
            messageId: result
        });

    } catch (err: any) {
        console.error('Template send error:', err);

        if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            throw error(400, 'Invalid reportId or templateId');
        }

        throw error(500, err.message || 'Failed to send template');
    }
};