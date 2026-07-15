import { writable } from "svelte/store";

import {
    getMeetings,
    getProductionReport,
    getActions,
    getAnalytics
} from "$lib/services/database";

export const dashboard = writable({
    meetings: [],
    production: [],
    actions: [],
    analytics: {
        totalMeetings: 0,
        totalContacts: 0,
        totalGroups: 0,
        totalMessages: 0
    },
    loading: true,
    lastRefresh: null
});

let refreshTimer: any = null;

export async function loadDashboard() {

    try {

        const [
            meetings,
            production,
            actions,
            analytics
        ] = await Promise.all([

            getMeetings().catch(() => []),

            getProductionReport().catch(() => []),

            getActions().catch(() => []),

            getAnalytics().catch(() => ({
                totalMeetings: 0,
                totalContacts: 0,
                totalGroups: 0,
                totalMessages: 0
            }))

        ]);

        meetings.sort((a: any, b: any) => {

            const da = new Date(
                `${a.date || a.meeting_date} ${a.start_time || "00:00"}`
            ).getTime();

            const db = new Date(
                `${b.date || b.meeting_date} ${b.start_time || "00:00"}`
            ).getTime();

            return db - da;

        });

        actions.sort((a: any, b: any) => b.id - a.id);

        production.sort((a: any, b: any) => b.id - a.id);

        dashboard.set({

            meetings,

            production,

            actions,

            analytics,

            loading: false,

            lastRefresh: new Date()

        });

    } catch (err) {

        console.error("Dashboard Load Error", err);

        dashboard.update(d => ({
            ...d,
            loading: false
        }));

    }

}

export function startDashboardRefresh() {

    loadDashboard();

    if (refreshTimer) {

        clearInterval(refreshTimer);

    }

    refreshTimer = setInterval(() => {

        loadDashboard();

    }, 60000);

    if (typeof window !== "undefined") {

        const reload = () => loadDashboard();

        window.addEventListener("meetings:updated", reload);

        window.addEventListener("actions:updated", reload);

        window.addEventListener("production:updated", reload);

        return () => {

            clearInterval(refreshTimer);

            window.removeEventListener("meetings:updated", reload);

            window.removeEventListener("actions:updated", reload);

            window.removeEventListener("production:updated", reload);

        };

    }

    return () => {

        clearInterval(refreshTimer);

    };

}