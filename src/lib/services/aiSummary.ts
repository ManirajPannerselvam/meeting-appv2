import { evaluateRules } from "./aiRules";
import { buildExecutiveSummary } from "./aiNarrator";

import {
    getMeetings,
    getActions,
    getProductionReport,
    getMachineDowntime
} from "$lib/services/database";

export async function generateAISummary() {

    console.log("=================================");
    console.log("Loading AI Executive Summary");
    console.log("=================================");

    //----------------------------------
    // Load Database
    //----------------------------------

    const [
        meetings,
        actions,
        production,
        downtime
    ] = await Promise.all([

        getMeetings(),

        getActions(),

        getProductionReport(),

        getMachineDowntime()

    ]);

    console.log("Meetings:", meetings.length);
    console.log("Actions:", actions.length);
    console.log("Production:", production.length);
    console.log("Downtime:", downtime.length);

    //----------------------------------
    // Today
    //----------------------------------

    const today = new Date()
        .toISOString()
        .substring(0, 10);

    //----------------------------------
    // Today's Meetings
    //----------------------------------

    const todayMeetingList = meetings.filter((m: any) => {

        if (!m.meeting_date) return false;

        return m.meeting_date.substring(0, 10) === today;

    });

    const todayMeetings = todayMeetingList.length;

    const upcomingMeetings = meetings.filter((m: any) => {

        if (!m.meeting_date) return false;

        return new Date(m.meeting_date) > new Date(today);

    }).length;

    const completedMeetings = meetings.filter((m: any) => {

        if (!m.meeting_date) return false;

        return new Date(m.meeting_date) < new Date(today);

    }).length;

    //----------------------------------
    // Today's Production
    //----------------------------------

    const todayProduction = production.filter((p: any) => {

        if (!p.report_date) return false;

        return p.report_date.substring(0, 10) === today;

    });

    //----------------------------------
    // Today's Downtime
    //----------------------------------

    const todayDowntime = downtime.filter((d: any) => {

        if (!d.report_date) return false;

        return d.report_date.substring(0, 10) === today;

    });

//----------------------------------
// Production Summary
//----------------------------------

const target = todayProduction.reduce(
    (total: number, row: any) =>
        total + Number(row.target || 0),
    0
);

const actual = todayProduction.reduce(
    (total: number, row: any) =>
        total + Number(row.actual || 0),
    0
);

const totalNG = todayProduction.reduce(
    (total: number, row: any) =>
        total + Number(row.ng || 0),
    0
);

const goodQty = Math.max(
    0,
    actual - totalNG
);

const achievement =
    target > 0
        ? (actual / target) * 100
        : 0;

//----------------------------------
// Yield
//----------------------------------

const avgYield =
    todayProduction.length > 0
        ? todayProduction.reduce(
              (total: number, row: any) =>
                  total + Number(row.yield || 0),
              0
          ) / todayProduction.length
        : 0;

//----------------------------------
// OEE
//----------------------------------

const avgOEE =
    todayProduction.length > 0
        ? todayProduction.reduce(
              (total: number, row: any) =>
                  total + Number(row.oee || 0),
              0
          ) / todayProduction.length
        : 0;

//----------------------------------
// Reject Rate
//----------------------------------

const avgRR =
    todayProduction.length > 0
        ? todayProduction.reduce(
              (total: number, row: any) =>
                  total + Number(row.rr || 0),
              0
          ) / todayProduction.length
        : 0;

//----------------------------------
// Downtime
//----------------------------------

const totalDowntime =
    todayDowntime.reduce(
        (total: number, row: any) =>
            total + Number(row.duration_min || 0),
        0
    );

const highestDowntime =
    todayDowntime.length > 0
        ? [...todayDowntime].sort(
              (a: any, b: any) =>
                  Number(b.duration_min || 0) -
                  Number(a.duration_min || 0)
          )[0]
        : null;

//----------------------------------
// Downtime Details
//----------------------------------

const highestMachine =
    highestDowntime?.machine ?? "-";

const highestReason =
    highestDowntime?.reason ?? "-";

const highestDuration =
    Number(highestDowntime?.duration_min || 0);

//----------------------------------
// Meeting Summary
//----------------------------------

const meetingDepartments =
    [...new Set(
        todayMeetingList.map(
            (m: any) => m.department || "-"
        )
    )];

const meetingTypes =
    [...new Set(
        todayMeetingList.map(
            (m: any) => m.type || "-"
        )
    )];

const meetingTitles =
    todayMeetingList.map((m: any) => ({

        title:
            m.title ||
            m.meeting_title ||
            "Meeting",

        department:
            m.department || "-",

        organizer:
            m.organizer || "-",

        startTime:
            m.start_time || "-",

        location:
            m.location || "-"

    }));

//----------------------------------
// Action Summary
//----------------------------------

const pendingActionList =
    actions.filter(
        (a: any) => a.status === "Pending"
    );

const overdueActionList =
    actions.filter(
        (a: any) => a.status === "Overdue"
    );

const completedActionList =
    actions.filter(
        (a: any) => a.status === "Completed"
    );

const pendingActions =
    pendingActionList.length;

const overdueActions =
    overdueActionList.length;

const completedActions =
    completedActionList.length;

//----------------------------------
// Top Pending Actions
//----------------------------------

const topPendingActions =
    pendingActionList
        .slice(0, 5)
        .map((a: any) => ({

            title:
                a.action ||
                a.title ||
                "Action",

            owner:
                a.owner ||
                "-",

            dueDate:
                a.due_date ||
                "-"

        }));

//----------------------------------
// Top Overdue Actions
//----------------------------------

const topOverdueActions =
    overdueActionList
        .slice(0, 5)
        .map((a: any) => ({

            title:
                a.action ||
                a.title ||
                "Action",

            owner:
                a.owner ||
                "-",

            dueDate:
                a.due_date ||
                "-"

        }));

console.log("Today's Meetings :", todayMeetings);
console.log("Pending Actions :", pendingActions);
console.log("Overdue Actions :", overdueActions);

//----------------------------------
// AI Rule Engine
//----------------------------------

const positives: string[] = [];
const warnings: string[] = [];
const critical: string[] = [];
const recommendations: string[] = [];

/* ==========================
   Yield
========================== */

if (avgYield >= 99.5) {

    positives.push(
        `Excellent production yield (${avgYield.toFixed(2)}%).`
    );

}
else if (avgYield >= 98) {

    warnings.push(
        `Yield reduced to ${avgYield.toFixed(2)}%.`
    );

    recommendations.push(
        "Review SMT/FATP process capability."
    );

}
else {

    critical.push(
        `Yield critically low (${avgYield.toFixed(2)}%).`
    );

    recommendations.push(
        "Immediate Quality Review required."
    );

}

/* ==========================
   Production Achievement
========================== */

if (achievement >= 100) {

    positives.push(
        "Production target achieved."
    );

}
else if (achievement >= 95) {

    warnings.push(
        `Production achievement is ${achievement.toFixed(1)}%.`
    );

}
else {

    critical.push(
        `Production target achievement only ${achievement.toFixed(1)}%.`
    );

    recommendations.push(
        "Increase production output."
    );

}

/* ==========================
   Reject Rate
========================== */

if (avgRR > 0.5) {

    warnings.push(
        `Reject Rate is ${avgRR.toFixed(2)}%.`
    );

    recommendations.push(
        "Analyze top reject reasons."
    );

}

/* ==========================
   NG Quantity
========================== */

if (totalNG > 500) {

    warnings.push(
        `${totalNG} NG units produced today.`
    );

    recommendations.push(
        "Review highest NG defect."
    );

}

/* ==========================
   Downtime
========================== */

if (totalDowntime > 0) {

    warnings.push(

        `${highestMachine} stopped for ${highestDuration} minutes.`

    );

    recommendations.push(

        `Investigate ${highestReason}.`

    );

}

if (totalDowntime > 120) {

    critical.push(

        `Factory downtime exceeded 120 minutes.`

    );

}

/* ==========================
   Meetings
========================== */

if (todayMeetings > 0) {

    positives.push(

        `${todayMeetings} meetings scheduled today.`

    );

}

if (todayMeetings === 0) {

    warnings.push(

        "No meetings scheduled today."

    );

}

/* ==========================
   Actions
========================== */

if (pendingActions > 10) {

    warnings.push(

        `${pendingActions} pending actions.`

    );

}

if (overdueActions > 0) {

    critical.push(

        `${overdueActions} overdue actions require attention.`

    );

    recommendations.push(

        "Close overdue actions immediately."

    );

}

/* ==========================
   Overall Status
========================== */

let health = "Healthy";

if (warnings.length > 0)
    health = "Attention";

if (critical.length > 0)
    health = "Critical";

console.log("Factory Health:", health);

//----------------------------------
// Executive Summary
//----------------------------------

const executiveSummary = buildExecutiveSummary({

    health,

    production: {

        target,

        actual,

        good: goodQty,

        ng: totalNG,

        achievement,

        yield: avgYield,

        oee: avgOEE,

        rr: avgRR,

        downtime: totalDowntime

    },

    downtime: {

        total: totalDowntime,

        machine: highestMachine,

        reason: highestReason,

        duration: highestDuration

    },

    meetings: {

        today: todayMeetings,

        upcoming: upcomingMeetings,

        completed: completedMeetings

    },

    meetingTitles,

    actions: {

        pending: pendingActions,

        overdue: overdueActions,

        completed: completedActions

    },

    topPendingActions,

    topOverdueActions,

    positives,

    warnings,

    critical,

    recommendations

});

console.log("=================================");
console.log("AI Summary Generated");
console.log(executiveSummary);
console.log("=================================");

//----------------------------------
// Return
//----------------------------------

return {

    health,

    executiveSummary,

    production: {

        target,

        actual,

        good: goodQty,

        ng: totalNG,

        achievement,

        yield: Number(avgYield.toFixed(2)),

        oee: Number(avgOEE.toFixed(2)),

        rr: Number(avgRR.toFixed(2)),

        downtime: totalDowntime

    },

    meetings: {

        today: todayMeetings,

        upcoming: upcomingMeetings,

        completed: completedMeetings,

        list: meetingTitles

    },

    actions: {

        pending: pendingActions,

        overdue: overdueActions,

        completed: completedActions,

        pendingList: topPendingActions,

        overdueList: topOverdueActions

    },

    downtime: {

        total: totalDowntime,

        machine: highestMachine,

        reason: highestReason,

        duration: highestDuration

    },

    positives,

    issues: [

        ...critical,

        ...warnings

    ],

    recommendations

};

}