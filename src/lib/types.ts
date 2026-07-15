export type FieldType = 'text' | 'number' | 'dropdown' | 'textarea' | 'formula';

export interface TemplateField {
  name: string;        // maps from field_name
  label?: string;      // display name
  type: FieldType;     // maps from field_type
  options?: string[];  // for dropdown
  required?: boolean;
}

export interface Template {
  id: string;              // uuid from supabase
  name: string;
  template_code: string;   // your PK code like "AXI01"
  category: string;
  description: string;
  data: {                  // this is jsonb column in supabase
    version?: number; 
    icon?: string;
    department?: string;
    fields: any[];         // we normalize this with normalizeFields()
  }
  created_at?: string;
  updated_at?: string;
}

export interface RecordRow {
  id: string;           // uuid from supabase
  t_code: string;       // = template_code
  t_ver: number;        // = data.version
  ts: string;           // timestamp
  shift: string;        // A, B, C
  station: string;      // Line1, Line2
  data: Record<string, any>; // all form fields go here as jsonb
  user_name?: string;
  created_at: string;
}