import { json } from "@sveltejs/kit";
import db from "$lib/server/db";
import jwt from "jsonwebtoken";
import { env } from "$env/dynamic/private";

export const POST = async ({ request }) => {
    const auth = request.headers.get("authorization");

    if (!auth?.startsWith("Bearer ")) {
        return json({ success: false, message: "No token" }, { status: 401 });
    }

    const token = auth.replace("Bearer ", "");

    let user: any;
    try {
        user = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
        console.error("JWT Error:", err);
        return json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const { groupId, contactId } = await request.json();
    const mobile = user.mobile;

    console.log("Mark read request:", { mobile, groupId, contactId });

    try {
        // Check if table exists first
        const tableCheck = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='message_receipts'
        `).get();

        if (!tableCheck) {
            console.error("Table 'message_receipts' does not exist");
            return json({ success: false, message: "Table not found" }, { status: 500 });
        }

        // Simple update - groupId/contactId இல்லாம
        if (groupId) {
            const result = db.prepare(`
                UPDATE message_receipts
                SET read = 1, read_at = datetime('now')
                WHERE mobile = ? AND group_id = ? AND read = 0
            `).run(mobile, groupId);
            console.log("Group update result:", result);
        }

        if (contactId) {
            const result = db.prepare(`
                UPDATE message_receipts
                SET read = 1, read_at = datetime('now')
                WHERE mobile = ? AND contact_id = ? AND read = 0
            `).run(mobile, contactId);
            console.log("Contact update result:", result);
        }

        // Table ல அந்த columns இல்லனா fallback
        if (!groupId && !contactId) {
            const result = db.prepare(`
                UPDATE message_receipts
                SET read = 1, read_at = datetime('now')
                WHERE mobile = ? AND read = 0
            `).run(mobile);
            console.log("All messages update result:", result);
        }

        return json({ success: true });
    } catch (err) {
        console.error("DB Error Details:", err);
        return json({ 
            success: false, 
            message: "Database error", 
            error: String(err) 
        }, { status: 500 });
    }
};