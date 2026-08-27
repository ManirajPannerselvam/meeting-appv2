import { supabase } from '$lib/supabaseClient';

export async function saveReport(report: any) {
  try {
    const reportDate = new Date().toISOString().split('T')[0];

    // OLD CODE - Keep for backup (30 days)
    const { error: oldError } = await supabase
     .from('messages')
     .insert({
        content: JSON.stringify(report),
        created_at: new Date().toISOString()
      });

    if (oldError) console.error('Old save error:', oldError);

    // NEW CODE - 75% smaller (96kB -> 24kB)
    const { data, error: newError } = await supabase
     .from('daily_reports_new')
     .insert({
        report_date: reportDate,
        station: report.values?.station || report.station || 'Packing',
        shift: report.values?.shift || report.shift || 'B',
        template_id: report.template_id,
        template_code: report.template_code || 'PRO01',
        template_name: report.template_name || 'Production Tracker',
        values: report.values, // jsonb - auto 85% compressed
        remark: report.values?.remark01 || report.remark || null,
        created_at: new Date().toISOString()
      })
     .select()
     .single();

    if (newError) {
      console.error('New save error:', newError);
      throw newError;
    }

    console.log('Saved OK - Old:',!oldError, 'New:', data?.id, 'Size: 24kB vs 96kB');
    return data;

  } catch (err) {
    console.error('saveReport failed:', err);
    throw err;
  }
}