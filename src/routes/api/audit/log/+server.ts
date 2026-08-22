/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/api/audit/log/+server.ts
 * ============================================================
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { writeAuditLog } from '$lib/server/audit';
import { supabaseChatServer } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json() as {
            user_id: string | null;
            action: 'CREATE' | 'UPDATE' | 'DELETE';
            module: string;
            record_id: string;
            description: string;
            new_data?: unknown;
        };
        
        // FIX: writeAuditLog needs (supabase, user, log)
        await writeAuditLog(supabaseChatServer, 
            body.user_id ? { id: body.user_id } as any : null, 
            {
                action: body.action,
                module: body.module,
                record_id: body.record_id,
                description: body.description,
                new_data: body.new_data
            }
        );
        
        return json({ success: true });
    } catch (err: unknown) {
        console.error('Audit API error:', err);
        const message = err instanceof Error ? err.message : 'Failed to write audit log';
        throw error(500, message);
    }
}