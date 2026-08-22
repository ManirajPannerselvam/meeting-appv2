/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/api/user/status/+server.ts
 * ============================================================
 * PURPOSE
 * Update and fetch user online status
 * ============================================================
 */

import { json, error } from "@sveltejs/kit";
import db from "$lib/server/db";
import type { RequestHandler } from './$types';

type UserRow = {
    status: 'online' | 'offline' | 'away' | 'busy';
    last_seen: string | null;
}

// POST - Update current user status
export const POST: RequestHandler = async ({ request }) => {
    try {
        const { status } = await request.json() as { status: UserRow['status'] };
        const currentUserId = 1; // TODO: Get from JWT/session
        
        console.log('Updating user:', currentUserId, 'to', status);
        
        const validStatus: UserRow['status'][] = ['online', 'offline', 'away', 'busy'];
        if (!validStatus.includes(status)) {
            throw error(400, 'Invalid status value');
        }

        // Ensure user exists first with minimal data
        db.prepare(`
            INSERT OR IGNORE INTO users (id, username, status, last_seen)
            VALUES (?, ?, ?, datetime('now', 'localtime'))
        `).run(currentUserId, `user_${currentUserId}`, status);

        // Update status
        const result = db.prepare(`
            UPDATE users 
            SET status = ?, last_seen = datetime('now', 'localtime')
            WHERE id = ?
        `).run(status, currentUserId);

        return json({ success: true, status, changes: result.changes });
    } catch (err: unknown) {
        console.error('POST /api/user/status error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw error(500, message);
    }
};

// GET - Get user status by id
export const GET: RequestHandler = async ({ url }) => {
    try {
        const id = url.searchParams.get('id');
        
        if (!id) {
            return json({ success: true, status: 'offline' as const, last_seen: null });
        }

        // Fix TS2339: type the .get() result
        const user = db.prepare(`
            SELECT status, last_seen
            FROM users
            WHERE id = ?
        `).get(id) as UserRow | undefined;

        return json({ 
            success: true, 
            status: user?.status || 'offline',
            last_seen: user?.last_seen || null
        });
    } catch (err: unknown) {
        console.error('GET /api/user/status error:', err);
        return json({ success: true, status: 'offline' as const, last_seen: null });
    }
};