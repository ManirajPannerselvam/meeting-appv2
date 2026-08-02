import { json } from "@sveltejs/kit";
import { prisma } from "$lib/db.server";

/* DELETE */
export async function DELETE({ params }) {
    try {
        const id = Number(params.id);

        await prisma.meeting.delete({
            where: {
                id
            }
        });

        return json({ success: true });

    } catch (error) {
        console.error("DELETE meeting error:", error);

        return json(
            { success: false, error: "Failed to delete meeting" },
            { status: 500 }
        );
    }
}


/* UPDATE */
export async function PUT({ params, request }) {
    try {
        const id = Number(params.id);

        const {
            title,
            date,
            type,
            agenda,
            location
        } = await request.json();


        await prisma.meeting.update({
            where: {
                id
            },
            data: {
                title,
                date,
                type,
                agenda,
                location
            }
        });


        return json({ success: true });

    } catch (error) {
        console.error("UPDATE meeting error:", error);

        return json(
            { success: false, error: "Failed to update meeting" },
            { status: 500 }
        );
    }
}