import { writable } from "svelte/store";

import {
    getMachineDowntime,
    getTodayDowntime
} from "$lib/services/database";

export const machineDowntime = writable({

    loading: true,

    items: [] as any[],

    today: [] as any[],

    totalMinutes: 0,

    totalMachines: 0,

    highestMachine: "",

    highestMinutes: 0

});

export async function refreshMachineDowntime() {

    machineDowntime.update(v => ({

        ...v,

        loading: true

    }));

    try {

        const items = await getMachineDowntime();

        const today = await getTodayDowntime();

        const totalMinutes = today.reduce(

            (t: number, r: any) =>

                t + Number(r.duration_min || 0),

            0

        );

        const machines = [...new Set(

            today.map((r: any) => r.machine)

        )];

        let highestMachine = "";

        let highestMinutes = 0;

        today.forEach((r: any) => {

            const mins = Number(r.duration_min || 0);

            if (mins > highestMinutes) {

                highestMinutes = mins;

                highestMachine = r.machine;

            }

        });

        machineDowntime.set({

            loading: false,

            items,

            today,

            totalMinutes,

            totalMachines: machines.length,

            highestMachine,

            highestMinutes

        });

    }

    catch (err) {

        console.error(err);

        machineDowntime.update(v => ({

            ...v,

            loading: false

        }));

    }

}

export function startMachineDowntimeRefresh() {

    refreshMachineDowntime();

    const timer = setInterval(() => {

        refreshMachineDowntime();

    }, 60000);

    return () => clearInterval(timer);

}