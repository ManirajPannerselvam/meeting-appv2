import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    return json({ 
        success: true, 
        server_time: new Date().toISOString(),
        status: 'online' 
    });
};