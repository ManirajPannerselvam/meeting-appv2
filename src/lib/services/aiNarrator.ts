export function buildExecutiveSummary(data: any): string {

    const lines: string[] = [];

    /* =========================
       Factory Health
    ========================= */

    lines.push(`Factory Health : ${data.health}`);

    /* =========================
       Production
    ========================= */

    lines.push("");

    lines.push(
        `Production achieved ${data.production.actual.toLocaleString()} units against a target of ${data.production.target.toLocaleString()}.`
    );

    lines.push(
        `Achievement : ${data.production.achievement.toFixed(1)}%.`
    );

    lines.push(
        `Yield : ${data.production.yield.toFixed(2)}%.`
    );

    lines.push(
        `Reject Rate : ${data.production.rr.toFixed(2)}%.`
    );

    lines.push(
        `NG Quantity : ${data.production.ng.toLocaleString()}.`
    );

    /* =========================
       Downtime
    ========================= */

    lines.push("");

    if (data.downtime.total > 0) {

        lines.push(
            `Today's downtime was ${data.downtime.total} minutes.`
        );

        lines.push(
            `Highest downtime occurred on ${data.downtime.machine}.`
        );

        lines.push(
            `Reason : ${data.downtime.reason}.`
        );

    } else {

        lines.push(
            "No machine downtime was recorded today."
        );

    }

    /* =========================
       Meetings
    ========================= */

    lines.push("");

    if (data.meetings.today > 0) {

        lines.push(
            `${data.meetings.today} meeting(s) scheduled today.`
        );

        data.meetingTitles.forEach((m: any) => {

            lines.push(
                `• ${m.title} (${m.startTime}) - ${m.department}`
            );

        });

    } else {

        lines.push(
            "No meetings scheduled today."
        );

    }

    /* =========================
       Actions
    ========================= */

    lines.push("");

    lines.push(
        `Pending Actions : ${data.actions.pending}`
    );

    lines.push(
        `Completed Actions : ${data.actions.completed}`
    );

    lines.push(
        `Overdue Actions : ${data.actions.overdue}`
    );

    if (data.actions.overdue > 0) {

        lines.push("");

        lines.push("Top Overdue Actions:");

        data.topOverdueActions.forEach((a: any) => {

            lines.push(
                `• ${a.title} (${a.owner})`
            );

        });

    }

    /* =========================
       Positive
    ========================= */

    if (data.positives.length > 0) {

        lines.push("");

        lines.push("Positive Highlights:");

        data.positives.forEach((p: string) => {

            lines.push(`• ${p}`);

        });

    }

    /* =========================
       Warning
    ========================= */

    if (data.warnings.length > 0) {

        lines.push("");

        lines.push("Warnings:");

        data.warnings.forEach((w: string) => {

            lines.push(`• ${w}`);

        });

    }

    /* =========================
       Critical
    ========================= */

    if (data.critical.length > 0) {

        lines.push("");

        lines.push("Critical Issues:");

        data.critical.forEach((c: string) => {

            lines.push(`• ${c}`);

        });

    }

    /* =========================
       Recommendation
    ========================= */

    if (data.recommendations.length > 0) {

        lines.push("");

        lines.push("Recommended Actions:");

        data.recommendations.forEach((r: string) => {

            lines.push(`• ${r}`);

        });

    }

    return lines.join("\n");

}

