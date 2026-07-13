import { json, error } from "@sveltejs/kit";
import db from "$lib/server/db";
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const groupId = url.searchParams.get('groupId');
        const contactId = url.searchParams.get('contactId');

        // TODO: Get from JWT/session - change this to your number/name
        const currentUser = 'User';

        let sql = `
            SELECT
                m.id,
                m.group_id,
                m.contact_id,
                m.sender,
                m.message,
                m.type,
                COALESCE(m.delivered, 0) as delivered,
                COALESCE(m.read, 0) as read,
                m.template_id,
                COALESCE(m.created_at, m.timestamp) as created_at,
                CASE WHEN m.sender =? THEN 1 ELSE 0 END as is_own
            FROM messages m
            WHERE 1=1
        `;
        const params: any[] = [currentUser];

        if (groupId) {
            sql += ` AND m.group_id =?`;
            params.push(groupId);
        }
        if (contactId) {
            sql += ` AND m.contact_id =?`;
            params.push(contactId);
        }

        sql += ` ORDER BY COALESCE(m.created_at, m.timestamp) ASC`;

        const messages = db.prepare(sql).all(...params);

        return json({
            success: true,
            messages
        });

    } catch (err: any) {
        console.error('Messages fetch error:', err);
        throw error(500, err.message || 'Failed to fetch messages');
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            group_id,
            contact_id,
            message,
            type = 'text',
            template_id = null
        } = body;

        if (!message) {
            throw error(400, 'Message is required');
        }

        if (!group_id &&!contact_id) {
            throw error(400, 'Either group_id or contact_id is required');
        }

        // TODO: Get sender from JWT token
        const sender = body.sender || 'User';

        const result = db.prepare(`
            INSERT INTO messages
            (group_id, contact_id, sender, message, type, template_id, delivered, read, created_at)
            VALUES (?,?,?,?,?,?, 0, 0, datetime('now', 'localtime'))
        `).run(
            group_id || null,
            contact_id || null,
            sender,
            message,
            type,
            template_id
        );

        return json({
            success: true,
            messageId: result.lastInsertRowid,
            message: 'Message sent'
        }, { status: 201 });

    } catch (err: any) {
        console.error('Message send error:', err);
        throw error(500, err.message || 'Failed to send message');
    }
};