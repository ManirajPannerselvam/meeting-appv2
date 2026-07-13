// ✅ Shared OTP storage - Memory based for testing
// Production ல Redis அல்லது Supabase table use பண்ணுங்க

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export function storeOtp(mobile: string, otp: string) {
    otpStore.set(mobile, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
    });
    console.log(`OTP stored for ${mobile}: ${otp}`);
}

export function verifyStoredOtp(mobile: string, otp: string): boolean {
    const stored = otpStore.get(mobile);
    
    if (!stored) {
        console.log(`No OTP found for ${mobile}`);
        return false;
    }

    // Check expiry
    if (Date.now() > stored.expiresAt) {
        console.log(`OTP expired for ${mobile}`);
        otpStore.delete(mobile);
        return false;
    }

    // Check match
    const isValid = stored.otp === otp;
    
    if (isValid) {
        otpStore.delete(mobile); // OTP use பண்ணிட்டோம்
        console.log(`OTP verified for ${mobile}`);
    } else {
        console.log(`Invalid OTP for ${mobile}. Expected: ${stored.otp}, Got: ${otp}`);
    }
    
    return isValid;
}

export function clearExpiredOtps() {
    const now = Date.now();
    for (const [mobile, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(mobile);
        }
    }
}

// Clear expired OTPs every minute
if (typeof setInterval !== 'undefined') {
    setInterval(clearExpiredOtps, 60 * 1000);
}