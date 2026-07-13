import { json, error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import { verifyStoredOtp } from '$lib/server/otp-store'; // ✅ Import from lib
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST({ request }) {
    try {
        const { mobile, otp } = await request.json();

        if (!mobile || !otp) {
            throw error(400, 'Mobile and OTP are required');
        }

        console.log('Verify OTP Request:', { mobile, otp });

        // ✅ Verify OTP from store
        const isValidOtp = verifyStoredOtp(mobile, otp);

        if (!isValidOtp) {
            console.log('Invalid OTP for:', mobile);
            throw error(401, 'Invalid OTP');
        }

        // ✅ Get or Create user
        let { data: user, error: userError } = await supabase
          .from('users')
          .select('id, mobile, name, role, is_active')
          .eq('mobile', mobile)
          .maybeSingle();

        if (userError) {
            console.error('User fetch error:', userError);
            throw error(500, 'Database error');
        }

        if (!user) {
            // Create new user
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                    mobile: mobile,
                    name: `User ${mobile.slice(-4)}`,
                    role: 'user',
                    is_active: true
                })
              .select()
              .single();

            if (createError) {
                console.error('User create error:', createError);
                throw error(500, 'Failed to create user');
            }
            user = newUser;
            console.log('New user created:', user.id);
        }

        if (!user.is_active) {
            throw error(403, 'Account disabled');
        }

        // ✅ Generate JWT with role
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

        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);

        console.log('Login successful for:', user.mobile);

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
        console.error('Verify OTP error:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'OTP verification failed');
    }
}