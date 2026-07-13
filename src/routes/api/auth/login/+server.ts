import { json, error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { mobile, password, otp } = body;

        // ✅ Validation
        if (!mobile) {
            throw error(400, 'Mobile number is required');
        }

        // ✅ Mobile format check
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobile)) {
            throw error(400, 'Invalid mobile number format');
        }

        // 1. Check if user exists
        const { data: user, error: userError } = await supabase
           .from('users')
           .select('id, mobile, name, email, password_hash, role, is_active')
           .eq('mobile', mobile)
           .maybeSingle();

        if (userError) {
            console.error('User fetch error:', userError);
            throw error(500, 'Database error');
        }

        // 2. If user doesn't exist, create new user
        let currentUser = user;
        
        if (!user) {
            const { data: newUser, error: createError } = await supabase
               .from('users')
               .insert({
                    mobile: mobile,
                    name: `User ${mobile}`,
                    role: 'user', // ✅ Default role
                    is_active: true,
                    created_at: new Date().toISOString()
                })
               .select()
               .single();

            if (createError) {
                console.error('User create error:', createError);
                throw error(500, 'Failed to create user');
            }

            currentUser = newUser;
        }

        // 3. Check if user is active
        if (!currentUser.is_active) {
            throw error(403, 'Account is disabled. Contact admin.');
        }

        // 4. Password verification (if password provided)
        if (password && currentUser.password_hash) {
            const isValidPassword = await bcrypt.compare(password, currentUser.password_hash);
            if (!isValidPassword) {
                throw error(401, 'Invalid credentials');
            }
        }

        // 5. OTP verification (if OTP provided)
        if (otp) {
            // TODO: Add your OTP verification logic here
            // Example: Check against stored OTP in database or Redis
            const isValidOtp = await verifyOtp(mobile, otp);
            if (!isValidOtp) {
                throw error(401, 'Invalid OTP');
            }
        }

        // 6. Generate JWT token with role
        const token = jwt.sign(
            {
                userId: currentUser.id,
                mobile: currentUser.mobile,
                role: currentUser.role || 'user', // ✅ Role in JWT
                name: currentUser.name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 7. Update last login
        await supabase
           .from('users')
           .update({ last_login: new Date().toISOString() })
           .eq('id', currentUser.id);

        // 8. Return success response
        return json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: currentUser.id,
                    mobile: currentUser.mobile,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role || 'user' // ✅ Return role
                }
            }
        });

    } catch (err: any) {
        console.error('Login error:', err);
        
        // If it's already a SvelteKit error, throw it
        if (err.status) throw err;
        
        // Otherwise throw 500
        throw error(500, err.message || 'Login failed');
    }
};

// Helper function for OTP verification
async function verifyOtp(mobile: string, otp: string): Promise<boolean> {
    // TODO: Implement your OTP verification logic
    // For now, accept "123456" as valid OTP for testing
    if (otp === '123456') return true;
    
    // Example: Check from database
    // const { data } = await supabase
    //    .from('otp_verifications')
    //    .select('*')
    //    .eq('mobile', mobile)
    //    .eq('otp', otp)
    //    .gte('expires_at', new Date().toISOString())
    //    .maybeSingle();
    
    // return !!data;
    
    return false;
}