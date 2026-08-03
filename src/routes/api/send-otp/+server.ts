import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CHAT_URL, SUPABASE_CHAT_SERVICE_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

// Verify we're using service_role key
const keyPayload = JSON.parse(Buffer.from(SUPABASE_CHAT_SERVICE_KEY.split('.')[1], 'base64').toString());
console.log('[OTP] ENV Check:', {
    url: SUPABASE_CHAT_URL? 'LOADED' : 'MISSING',
    role: keyPayload.role,
    project: keyPayload.ref
});

const supabaseAdmin = createClient(SUPABASE_CHAT_URL, SUPABASE_CHAT_SERVICE_KEY);

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { mobile } = await request.json();

        if (!mobile) {
            throw error(400, 'Mobile number required');
        }

        // Normalize mobile
        const cleanMobile = String(mobile).replace(/\D/g, '');
        console.log('[OTP] Clean mobile:', cleanMobile);

        if (cleanMobile.length!== 10) {
            throw error(400, `Invalid mobile. Got ${cleanMobile.length} digits, need 10`);
        }

        const fullMobile = `+91${cleanMobile}`;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        console.log('[OTP] Generated:', { fullMobile, otp });

        // Delete old OTPs for this mobile
        const { error: deleteError } = await supabaseAdmin
           .from('otp_verifications')
           .delete()
           .eq('mobile', fullMobile)
           .eq('verified', false);

        if (deleteError) {
            console.error('[OTP] Delete Error:', deleteError);
        }

        // Insert new OTP
        const { data: insertData, error: insertError } = await supabaseAdmin
           .from('otp_verifications')
           .insert({
                mobile: fullMobile,
                otp: otp,
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                verified: false
            })
           .select()
           .single();

        if (insertError) {
            console.error('[OTP] INSERT ERROR:', insertError);
            throw error(500, `Insert failed: ${insertError.message}`);
        }

        console.log('[OTP] Success:', insertData.id);

        return json({
            success: true,
            otp: otp,
            message: 'OTP sent successfully'
        });

    } catch (err: any) {
        console.error('[OTP] CATCH ERROR:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'Failed to send OTP');
    }
};