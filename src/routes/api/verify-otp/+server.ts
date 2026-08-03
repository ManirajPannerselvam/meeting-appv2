import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CHAT_URL, SUPABASE_CHAT_SERVICE_KEY, JWT_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';
import type { RequestHandler } from './$types';

const supabaseAdmin = createClient(SUPABASE_CHAT_URL, SUPABASE_CHAT_SERVICE_KEY);

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { mobile, otp } = await request.json();

        if (!mobile || !otp) {
            throw error(400, 'Mobile and OTP are required');
        }

        // Match send-otp normalization exactly
        const cleanMobile = String(mobile).replace(/\D/g, '');
        
        if (cleanMobile.length!== 10) {
            throw error(400, `Invalid mobile. Got ${cleanMobile.length} digits, need 10`);
        }
        
        const fullMobile = `+91${cleanMobile}`;
        const cleanOtp = String(otp).trim();

        console.log('[VERIFY] Attempting:', { fullMobile, otp: cleanOtp });

        // 1. Verify OTP - check not expired and not used
        const { data: otpRecord, error: otpError } = await supabaseAdmin
           .from('otp_verifications')
           .select('*')
           .eq('mobile', fullMobile)
           .eq('otp', cleanOtp)
           .eq('verified', false)
           .gte('expires_at', new Date().toISOString())
           .maybeSingle();

        if (otpError) {
            console.error('[VERIFY] OTP query error:', otpError);
            throw error(500, 'Database error');
        }

        if (!otpRecord) {
            console.log('[VERIFY] OTP not found or expired');
            throw error(401, 'Invalid or expired OTP');
        }

        // 2. Mark OTP as used
        const { error: updateOtpError } = await supabaseAdmin
           .from('otp_verifications')
           .update({ verified: true })
           .eq('id', otpRecord.id);

        if (updateOtpError) {
            console.error('[VERIFY] Mark OTP used error:', updateOtpError);
        }

        // 3. Get or Create user
        let { data: user, error: userError } = await supabaseAdmin
           .from('users')
           .select('id, mobile, name, role, is_active')
           .eq('mobile', fullMobile)
           .maybeSingle();

        if (userError) {
            console.error('[VERIFY] User fetch error:', userError);
            throw error(500, 'Database error');
        }

        if (!user) {
            const { data: newUser, error: createError } = await supabaseAdmin
               .from('users')
               .insert({
                    mobile: fullMobile,
                    name: `User ${fullMobile.slice(-4)}`,
                    role: 'user',
                    is_active: true
                })
               .select()
               .single();

            if (createError) {
                console.error('[VERIFY] User create error:', createError);
                throw error(500, 'Failed to create user');
            }
            user = newUser;
            console.log('[VERIFY] New user created:', user.id);
        }

        if (!user.is_active) {
            throw error(403, 'Account disabled');
        }

        // 4. Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                mobile: user.mobile,
                role: user.role || 'user',
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 5. Update last login - don't await, fire and forget
        supabaseAdmin
           .from('users')
           .update({ last_login: new Date().toISOString() })
           .eq('id', user.id)
           .then(({ error }) => {
                if (error) console.error('[VERIFY] Last login update error:', error);
            });

        console.log('[VERIFY] Login successful:', user.mobile);

        return json({
            success: true,
            token,
            user: {
                id: user.id,
                mobile: user.mobile,
                name: user.name,
                role: user.role || 'user'
            }
        });

    } catch (err: any) {
        console.error('[VERIFY] Error:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'OTP verification failed');
    }
};