import { initDB } from './database';

export async function seedDatabase() {
    const db = await initDB();
    if (!db) return;

    try {
        // Check if already seeded
        const meetings = await db.select(`SELECT COUNT(*) as count FROM meetings`);
        if (meetings[0].count > 0) {
            console.log("DB already has data. Skipping seed.");
            return;
        }

        console.log("Seeding database...");

        // 1. SEED MEETINGS
        await db.execute(`INSERT INTO meetings (title, meeting_type, meeting_date, start_time, end_time, location, organizer, agenda, status, priority) VALUES
        ('Daily Production Review', 'Production', '2026-08-08', '09:00', '09:30', 'Plant Office', 'John Manager', 'Review yesterday production', 'Completed', 'High'),
        ('Safety Meeting', 'Safety', '2026-08-08', '14:00', '15:00', 'Conference Room', 'HR Head', 'PPE and Safety Audit', 'Scheduled', 'High'),
        ('Quality Circle', 'Quality', '2026-08-07', '11:00', '12:00', 'QC Lab', 'QC Lead', 'NG Analysis', 'Completed', 'Medium'),
        ('Management Review', 'Management', '2026-08-06', '16:00', '17:30', 'Board Room', 'GM', 'Monthly KPI Review', 'Completed', 'High')
        `);

        // 2. SEED MEETING ACTIONS
        await db.execute(`INSERT INTO meeting_actions (meeting_id, meeting_title, description, owner, due_date, status, priority) VALUES
        (1, 'Daily Production Review', 'Reduce NG by 2% in Line A', 'Rahul', '2026-08-15', 'Open', 'High'),
        (1, 'Daily Production Review', 'Update target sheet for Aug', 'Priya', '2026-08-10', 'Completed', 'Medium'),
        (2, 'Safety Meeting', 'Order 50 new helmets', 'Store Incharge', '2026-08-05', 'Overdue', 'High'),
        (3, 'Quality Circle', 'Root cause analysis for Batch 102', 'QC Team', '2026-08-12', 'Pending', 'High')
        `);

        // 3. SEED MACHINE DOWNTIME - Last 7 days
        const today = new Date();
        for(let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            await db.execute(`INSERT INTO machine_downtime (machine_name, reason, category, start_time, end_time, duration_minutes, report_date) VALUES
            ('Press Machine 1', 'Die Change', 'Changeover', '10:00', '10:45', 45, '${dateStr}'),
            ('Welding Robot', 'Sensor Fault', 'Breakdown', '14:20', '15:10', 50, '${dateStr}')
            `);
        }

        // 4. SEED TEMPLATES / PRODUCTION DATA
        await db.execute(`INSERT INTO templates (name, department, chart, chart_x, chart_y, fields) VALUES
        ('Production Report', 'Production', 'bar', 'date', 'actual', '[{"key":"target","label":"Target"},{"key":"actual","label":"Actual"},{"key":"good","label":"Good"},{"key":"ng","label":"NG"},{"key":"yield","label":"Yield %"},{"key":"oee","label":"OEE %"}]')
        `);

        console.log("✅ Database seeded successfully");
    } catch (e) {
        console.error("Seed failed:", e);
    }
}