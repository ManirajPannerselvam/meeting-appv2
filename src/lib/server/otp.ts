import { randomInt } from "crypto";

/**
 * Generate a secure random 6-digit OTP
 */
export function generateOTP(): string {
    return randomInt(100000, 1000000).toString();
}