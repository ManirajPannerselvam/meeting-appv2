import { json, error } from "@sveltejs/kit";
import db from "$lib/server/db";
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { contact_id, group_id } = await request.json();

        // TODO: Get current user from JWT
        const currentUser = 'User';

        if (contact_id) {
            db.prepare(`
                UPDATE messages
                SET read = 1, delivered = 1
                WHERE contact_id =? AND sender!=?
            `).run(contact_id, currentUser);
        }

        if (group_id) {
            db.prepare(`
                UPDATE messages
                SET read = 1, delivered = 1
                WHERE group_id =? AND sender!=?
            `).run(group_id, currentUser);
        }

        return json({ success: true });
    } catch (err: any) {
        throw error(500, err.message);
    }
};