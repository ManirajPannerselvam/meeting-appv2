import { json } from "@sveltejs/kit";
import { findUserByMobile } from "$lib/server/users";

export async function POST({ request }) {
  const { mobile, otp } = await request.json();

  const user = findUserByMobile(mobile);

  if (!user) {
    return json({ error: "User not found" }, { status: 404 });
  }

  if (user.otp !== otp) {
    return json({ error: "Invalid OTP" }, { status: 400 });
  }

  user.verified = true;

  return json({ success: true });
}