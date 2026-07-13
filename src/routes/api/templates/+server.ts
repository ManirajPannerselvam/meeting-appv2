import { json, error } from "@sveltejs/kit";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE } from '$env/static/private';
import type { RequestHandler } from './$types';

console.log('URL:', SUPABASE_URL, 'Key exists:', !!SUPABASE_SERVICE_ROLE);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function getUserFromToken(request: Request) {
  return {
    userId: null,
    role: 'admin'
  };
}

// GET
export const GET: RequestHandler = async () => {
  try {
    const { data: templates, error: templatesError } = await supabase
     .from('templates')
     .select('*')
     .eq('is_active', true)
     .order('name');

    if (templatesError) throw templatesError;

    const templatesWithFields = await Promise.all(
      (templates || []).map(async (t) => {
        const { data: fields } = await supabase
         .from('template_fields')
         .select('*')
         .eq('template_id', t.id)
         .order('display_order');

        return {
          ...t,
          fields: fields || []
        };
      })
    );

    return json({ success: true, data: templatesWithFields });

  } catch (err: any) {
    console.error('Template fetch error:', err);
    throw error(500, err.message || 'Failed to fetch templates');
  }
};

// POST
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userId, role } = getUserFromToken(request);
    if (role !== 'admin') throw error(403, 'Only admin can create templates');

    const body = await request.json();
    const {
      template_code, name, department, category, color, version, icon, description, fields
    } = body;

    if (!template_code || !name) throw error(400, 'Template Code and Name are required');
    if (!fields || fields.length === 0) throw error(400, 'At least one field is required');

    const { data: existing } = await supabase
     .from('templates')
     .select('id')
     .eq('template_code', template_code)
     .maybeSingle();

    if (existing) throw error(409, 'Template Code already exists');

    const { data: template, error: templateError } = await supabase
     .from('templates')
     .insert({
        template_code,
        name,
        department: department || null,
        category: category || null,
        version: version || 1,
        icon: icon || '📄',
        description: description || null,
        color: color || '#2563eb',
        created_by: userId,
        is_active: true
      })
     .select()
     .single();

    if (templateError) throw templateError;

    const fieldsToInsert = fields.map((f: any, index: number) => ({
      template_id: template.id,
      field_name: f.field_name || f.name || `field_${index + 1}`,
      field_label: f.field_label || f.label || f.name || `Field ${index + 1}`,
      field_type: f.field_type || f.type || 'text',
      placeholder: f.placeholder || null,
      required: f.required || false,
      readonly: f.readonly || false,
      hidden: f.hidden || false,
      display_order: index + 1,
      default_value: f.default_value || f.defaultValue || null,
      formula: f.formula || null,
      options_json: f.options ? JSON.stringify(f.options) : f.options_json || null,
      min_value: f.min_value ?? null,
      max_value: f.max_value ?? null
    }));

    const { error: fieldsError } = await supabase
     .from('template_fields')
     .insert(fieldsToInsert);

    if (fieldsError) {
      await supabase.from('templates').delete().eq('id', template.id);
      throw fieldsError;
    }

    return json({
      success: true,
      template_id: template.id,
      message: 'Template created successfully'
    }, { status: 201 });

  } catch (err: any) {
    console.error('Template creation error:', err);
    if (err.status) throw err;
    throw error(500, err.message || 'Failed to create template');
  }
};

// PUT
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { role } = getUserFromToken(request);
    if (role !== 'admin') throw error(403, 'Only admin can update templates');

    const body = await request.json();
    const { id, template_code, name, department, category, color, version, icon, description, fields } = body;

    if (!id) throw error(400, 'Template ID missing');
    if (!template_code || !name) throw error(400, 'Template Code and Name are required');

    const { data: existing } = await supabase
     .from('templates')
     .select('id')
     .eq('template_code', template_code)
     .neq('id', id)
     .maybeSingle();

    if (existing) throw error(409, 'Template Code already exists');

    const { error: updateError } = await supabase
     .from('templates')
     .update({
        template_code,
        name,
        department: department || null,
        category: category || null,
        version: version || 1,
        icon: icon || '📄',
        description: description || null,
        color: color || '#2563eb',
        updated_at: new Date().toISOString()
      })
     .eq('id', id);

    if (updateError) throw updateError;

    await supabase.from('template_fields').delete().eq('template_id', id);

    if (fields && fields.length > 0) {
      const fieldsToInsert = fields.map((f: any, index: number) => ({
        template_id: id,
        field_name: f.field_name || f.name || `field_${index + 1}`,
        field_label: f.field_label || f.label || f.name || `Field ${index + 1}`,
        field_type: f.field_type || f.type || 'text',
        placeholder: f.placeholder || null,
        required: f.required || false,
        readonly: f.readonly || false,
        hidden: f.hidden || false,
        display_order: index + 1,
        default_value: f.default_value || f.defaultValue || null,
        formula: f.formula || null,
        options_json: f.options ? JSON.stringify(f.options) : f.options_json || null,
        min_value: f.min_value ?? null,
        max_value: f.max_value ?? null
      }));

      const { error: fieldsError } = await supabase.from('template_fields').insert(fieldsToInsert);
      if (fieldsError) throw fieldsError;
    }

    return json({ success: true, message: 'Template updated successfully' });
  } catch (err: any) {
    console.error('Template update error:', err);
    if (err.status) throw err;
    throw error(500, err.message || 'Failed to update template');
  }
};

// DELETE
export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const { role } = getUserFromToken(request);
    if (role !== 'admin') throw error(403, 'Only admin can delete templates');

    const id = url.searchParams.get('id');
    if (!id) throw error(400, 'Missing ID');

    const { error: deleteError } = await supabase.from('templates').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ success: true, message: 'Template deleted successfully' });
  } catch (err: any) {
    console.error('Template delete error:', err);
    if (err.status) throw err;
    throw error(500, err.message || 'Failed to delete template');
  }
};