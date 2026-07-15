export interface RuleResult {
    positives: string[];
    warnings: string[];
    critical: string[];
    recommendations: string[];
}

export function evaluateRules(data: any): RuleResult {

    const positives: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];
    const recommendations: string[] = [];

    /* =======================
       PRODUCTION
    ======================= */

    if (data.production.yield >= 99.5) {
        positives.push("Production yield achieved company target.");
    }
    else if (data.production.yield >= 98) {
        warnings.push("Yield is below company target.");
        recommendations.push("Review process capability.");
    }
    else {
        critical.push("Yield is critically low.");
        recommendations.push("Immediate production review required.");
    }

    /* =======================
       Reject Rate
    ======================= */

    if (data.production.rr > 0.5) {

        warnings.push(
            `Reject Rate is ${data.production.rr.toFixed(2)}%.`
        );

        recommendations.push(
            "Analyze top reject reasons."
        );

    }

    /* =======================
       Downtime
    ======================= */

    if (data.production.downtime > 60) {

        critical.push(
            `Downtime reached ${data.production.downtime} minutes.`
        );

        recommendations.push(
            "Investigate machine breakdown."
        );

    }
    else if (data.production.downtime > 30) {

        warnings.push(
            `Downtime reached ${data.production.downtime} minutes.`
        );

    }

    /* =======================
       Meeting Actions
    ======================= */

    if (data.actions.overdue > 0) {

        critical.push(
            `${data.actions.overdue} overdue actions pending.`
        );

        recommendations.push(
            "Close overdue meeting actions."
        );

    }

    if (data.actions.pending > 10) {

        warnings.push(
            "High number of pending meeting actions."
        );

    }

    /* =======================
       Meetings
    ======================= */

    if (data.meetings.today === 0) {

        warnings.push(
            "No meetings conducted today."
        );

    }

    return {

        positives,
        warnings,
        critical,
        recommendations

    };

}