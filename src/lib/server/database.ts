import { prisma } from "$lib/db.server";


// =====================================
// MEETINGS
// =====================================


export async function getMeetings() {

    return await prisma.meeting.findMany({

        orderBy: {
            createdAt: "desc"
        }

    });

}




export async function getMeeting(id:number) {

    try {

        return await prisma.meeting.findUnique({

            where:{
                id
            }

        });

    }
    catch(error){

        console.error(
            "getMeeting error:",
            error
        );

        return null;

    }

}




export async function addMeeting(data:any) {


    return await prisma.meeting.create({

        data

    });

}





export async function updateMeeting(
    id:number,
    data:any
){

    return await prisma.meeting.update({

        where:{
            id
        },

        data

    });

}





export async function deleteMeeting(
    id:number
){

    return await prisma.meeting.delete({

        where:{
            id

        }

    });

}




// =====================================
// SIM INVENTORY
// =====================================


export async function getSIMs(){


    return await prisma.SIM.findMany({

        orderBy:{

            createdAt:"desc"

        }

    });


}





export async function getSIM(
    id:string
){


    return await prisma.SIM.findUnique({

        where:{
            id
        }

    });


}




export async function saveSIM(sim:any){


    return await prisma.SIM.create({

        data:{


            simNumber:
                sim.sim_number,


            operatorName:
                sim.operator_name,


            circle:
                sim.circle,


            planName:
                sim.plan_name,


            monthlyCost:
                Number(sim.monthly_cost ?? 0),


            assignedDevice:
                sim.assigned_device,


            owner:
                sim.owner,


            status:
                sim.status ?? "Available",


            remarks:
                sim.remarks


        }

    });


}





export async function updateSIM(
    id:string,
    data:any
){


    return await prisma.SIM.update({

        where:{
            id
        },

        data

    });


}




export async function deleteSIM(
    id:string
){


    return await prisma.SIM.delete({

        where:{
            id

        }

    });


}