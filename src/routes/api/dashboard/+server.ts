import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export const GET = async () => {

    const qty = db.prepare(`
        SELECT SUM(CAST(field_value AS INTEGER)) as totalQty
        FROM template_reports
        WHERE field_name = 'Qty'
    `).get();

    const ng = db.prepare(`
        SELECT SUM(CAST(field_value AS INTEGER)) as totalNG
        FROM template_reports
        WHERE field_name = 'NG'
    `).get();

    const machineCount = db.prepare(`
        SELECT COUNT(DISTINCT field_value) as machines
        FROM template_reports
        WHERE field_name = 'Machine'
    `).get();

    return json({
        success: true,
        kpi: {
            totalQty: qty.totalQty || 0,
            totalNG: ng.totalNG || 0,
            machines: machineCount.machines || 0,
            efficiency:
                qty.totalQty
                    ? ((qty.totalQty - (ng.totalNG || 0)) / qty.totalQty) * 100
                    : 0
        }
    });

};