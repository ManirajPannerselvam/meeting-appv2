/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/routes/api/sims/+server.ts
 * ============================================================
 * PURPOSE
 *   SIM inventory CRUD endpoints
 * ============================================================
 */

import type { RequestEvent } from '@sveltejs/kit';
import { json } from "@sveltejs/kit";
import { getSIMs, saveSIM } from "$lib/server/database";

export interface SIM {
  id?: number;
  iccid: string;
  phone_number: string;
  provider: string;
  status: 'Active' | 'Inactive' | 'Damaged' | 'Lost';
  assigned_to?: string | null;
  notes?: string | null;
  created_at?: string;
}

export async function GET() {
    const sims = await getSIMs();
    return json(sims);
}

export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json() as SIM;

        if (!body.iccid || !body.phone_number || !body.provider) {
            return json(
                { success: false, error: 'iccid, phone_number and provider are required' },
                { status: 400 }
            );
        }

        const sim = await saveSIM(body);
        return json({ success: true, data: sim });

    } catch (error) {
        console.error('[SIM API] POST error:', error);
        return json(
            { success: false, error: 'Failed to save SIM' },
            { status: 500 }
        );
    }
}