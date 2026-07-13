import { json, error } from '@sveltejs/kit';
import { storeOtp } from '$lib/server/otp-store'; // ✅ Import from lib

export async function POST({ request }) {
    try {
        const { mobile } = await request.json();

        if (!mobile || mobile.length !== 10) {
            throw error(400, 'Invalid mobile number');
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // ✅ Store OTP
        storeOtp(mobile, otp);

        console.log(`OTP for ${mobile}: ${otp}`);

        // TODO: Send SMS via Twilio/MSG91
        // await sendSMS(mobile, `Your OTP is ${otp}`);

        return json({
            success: true,
            otp: otp, // Testing purpose மட்டும்
            message: 'OTP sent successfully'
        });

    } catch (err: any) {
        console.error('Send OTP error:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'Failed to send OTP');
    }
}