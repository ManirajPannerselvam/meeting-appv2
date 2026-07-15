import { writable } from "svelte/store";
import { generateAISummary } from "$lib/services/aiSummary";

export const aiSummary = writable({

    loading: true,

    production: {

        target: 0,

        actual: 0,

        good: 0,

        ng: 0,

        achievement: 0,

        yield: 0,

        oee: 0

    },

    meetings: {

        today: 0,

        upcoming: 0,

        completed: 0

    },

    actions: {

        pending: 0,

        overdue: 0,

        completed: 0

    },

    issues: [],

    recommendations: []

});

export async function refreshAISummary() {

    aiSummary.update(v => ({

        ...v,

        loading: true

    }));

    try {

        console.log("================================");
        console.log("Refreshing AI Summary...");
        console.log("================================");

        const result = await generateAISummary();

        console.log("AI Summary Result:");
        console.log(result);

        aiSummary.set({

            loading: false,

            ...result

        });

    }

    catch (err) {

        console.error("================================");
        console.error("AI Summary ERROR");
        console.error(err);
        console.error("================================");

        aiSummary.update(v => ({

            ...v,

            loading: false

        }));

    }

}

export function startAISummaryRefresh() {

    refreshAISummary();

    const timer = setInterval(() => {

        refreshAISummary();

    }, 60000);

    return () => clearInterval(timer);

}