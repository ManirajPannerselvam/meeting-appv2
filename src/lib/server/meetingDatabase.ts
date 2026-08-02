import { prisma } from "$lib/db.server";


export async function getMeetings() {

    return await prisma.meeting.findMany({
        orderBy: {
            createdAt: "desc"
        }
    });

}


export async function createMeeting(data:any) {

    return await prisma.meeting.create({
        data
    });

}