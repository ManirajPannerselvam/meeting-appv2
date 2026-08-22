/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/api/templates/+server.ts
 * ============================================================
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env as publicEnv } from "$env/dynamic/public";
import { env as privateEnv } from "$env/dynamic/private";

export interface TemplateData {
	[key: string]: unknown;
	fields?: unknown[];
	department?: string;
}

export interface TemplateRecord {
	id: string;
	template_code: string;
	name: string;
	description: string | null;
	category: string | null;
	data: TemplateData;
	created_at: string;
	updated_at: string;
}

let templatesClient: SupabaseClient | null = null;

function getTemplatesSupabase(): SupabaseClient {
	if (templatesClient) return templatesClient;

	const url = publicEnv.PUBLIC_SUPABASE_TEMPLATES_URL?.trim();
	const serviceKey = privateEnv.SUPABASE_TEMPLATES_SERVICE_KEY?.trim();

	// FIX 1: Fail fast with 503 instead of 500 + HTML
	const missing: string[] = [];
	if (!url) missing.push("PUBLIC_SUPABASE_TEMPLATES_URL");
	if (!serviceKey) missing.push("SUPABASE_TEMPLATES_SERVICE_KEY");

	if (missing.length > 0) {
		console.error("Templates API Config Error:", missing.join(", "));
		throw new Error(`Missing env: ${missing.join(", ")}`);
	}

	templatesClient = createClient(url, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { headers: { "x-client-info": "temple-operations-templates-api" } }
	});

	return templatesClient;
}

function normalizeTemplate(template: Record<string, unknown> | null): TemplateRecord | null {
	if (!template) return null;

	let data: TemplateData = { fields: [] };

	const rawData = template.data;
	if (rawData && typeof rawData === "object" &&!Array.isArray(rawData)) {
		data = {...rawData as TemplateData };
	} else if (typeof rawData === "string") {
		try {
			const parsed = JSON.parse(rawData);
			if (parsed && typeof parsed === "object" &&!Array.isArray(parsed)) {
				data = {...parsed as TemplateData };
			}
	} catch { data = { fields: [] }; }
	}

	if (!Array.isArray(data.fields)) data.fields = [];

	return {
		id: String(template.id?? ""),
		template_code: String(template.template_code?? ""),
		name: String(template.name?? ""),
		description: template.description == null? null : String(template.description),
		category: template.category == null? null : String(template.category),
		data,
		created_at: String(template.created_at?? ""),
		updated_at: String(template.updated_at?? "")
	};
}

function normalizeTemplates(templates: Record<string, unknown>[]): TemplateRecord[] {
	return templates.map(normalizeTemplate).filter((t): t is TemplateRecord => t!== null);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message?: unknown }).message);
	}
	return "Unknown server error";
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
	try {
		const body: unknown = await request.json();
		if (!body || typeof body!== "object" || Array.isArray(body)) {
			throw new Error("Request body must be a JSON object.");
	}
		return body as Record<string, unknown>;
	} catch (error) {
		throw new Error("Invalid JSON request body: " + getErrorMessage(error));
	}
}

function stringValue(value: unknown): string {
	return typeof value === "string"? value.trim() : "";
}

function objectValue(value: unknown): Record<string, unknown> | null {
	if (value && typeof value === "object" &&!Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return null;
}

// ============================================================
// GET
// ============================================================

export const GET: RequestHandler = async ({ url }) => {
	try {
		const supabase = getTemplatesSupabase();
		const category = url.searchParams.get("category")?.trim();

		let query = supabase.from("templates").select("*").order("created_at", { ascending: false });
		if (category) query = query.eq("category", category);

		const { data, error } = await query;
		if (error) throw error;

		return json({ success: true, templates: normalizeTemplates((data?? []) as Record<string, unknown>[]) });
	} catch (error) {
		console.error("[Templates API] GET failed:", error);
		return json({ success: false, templates: [], error: getErrorMessage(error) }, { status: 500 });
	}
};

// ============================================================
// POST
// ============================================================

export const POST: RequestHandler = async ({ request }) => {
	try {
		const supabase = getTemplatesSupabase();
		const body = await readJsonBody(request);

		const templateCode = stringValue(body.template_code).toUpperCase();
		const name = stringValue(body.name);

		if (!templateCode) return json({ success: false, error: "Template Code is required." }, { status: 400 });
		if (!name) return json({ success: false, error: "Template Name is required." }, { status: 400 });

		const description = stringValue(body.description);
		const category = stringValue(body.category) || "General";
		const data = objectValue(body.data)?? { fields: [] };
		if (!Array.isArray(data.fields)) data.fields = [];

		const { data: created, error } = await supabase.from("templates").insert({
			template_code: templateCode,
			name,
			description: description || null,
			category,
			data
	}).select("*").single();

		if (error) {
			if (error.code === "23505") {
				return json({ success: false, error: "Template Code already exists." }, { status: 409 });
			}
			throw error;
	}

		return json({ success: true, template: normalizeTemplate(created as Record<string, unknown>) }, { status: 201 });
	} catch (error) {
		console.error("[Templates API] POST failed:", error);
		return json({ success: false, error: getErrorMessage(error) }, { status: 500 });
	}
};

// ============================================================
// PUT
// ============================================================

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const supabase = getTemplatesSupabase();
		const body = await readJsonBody(request);

		const id = stringValue(body.id);
		if (!id) return json({ success: false, error: "Template id is required." }, { status: 400 });

		const { data: existing, error: readError } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
		if (readError) throw readError;
		if (!existing) return json({ success: false, error: "Template not found." }, { status: 404 });

		const existingTemplate = normalizeTemplate(existing as Record<string, unknown>);
		const existingData = existingTemplate?.data?? { fields: [] };
		const mergedData: TemplateData = {...existingData };

		if (typeof body.department === "string") mergedData.department = body.department.trim();
		if (body.fields!== undefined) mergedData.fields = Array.isArray(body.fields)? body.fields : [];
		
		const incomingData = objectValue(body.data);
		if (incomingData) {
			for (const [key, value] of Object.entries(incomingData)) {
				if (key!== "fields") mergedData[key] = value; // FIX 2: don't overwrite fields twice
			}
	}

		if (!Array.isArray(mergedData.fields)) mergedData.fields = [];

		const updatePayload: Record<string, unknown> = {
			data: mergedData,
			updated_at: new Date().toISOString()
	};

		if (typeof body.name === "string") {
			const name = body.name.trim();
			if (!name) return json({ success: false, error: "Template Name cannot be empty." }, { status: 400 });
			updatePayload.name = name;
	}

		if (typeof body.template_code === "string") {
			const templateCode = body.template_code.trim().toUpperCase();
			if (!templateCode) return json({ success: false, error: "Template Code cannot be empty." }, { status: 400 });
			updatePayload.template_code = templateCode;
	}

		if (typeof body.description === "string") updatePayload.description = body.description.trim() || null;
		if (typeof body.category === "string") updatePayload.category = body.category.trim() || null;

		const { data: updated, error } = await supabase.from("templates").update(updatePayload).eq("id", id).select("*").single();
		if (error) {
			if (error.code === "23505") {
				return json({ success: false, error: "Template Code already exists." }, { status: 409 });
			}
			throw error;
	}

		return json({ success: true, template: normalizeTemplate(updated as Record<string, unknown>) });
	} catch (error) {
		console.error("[Templates API] PUT failed:", error);
		return json({ success: false, error: getErrorMessage(error) }, { status: 500 });
	}
};

// ============================================================
// DELETE
// ============================================================

export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const supabase = getTemplatesSupabase();
		const id = url.searchParams.get("id")?.trim();

		if (!id) return json({ success: false, error: "Template id is required." }, { status: 400 });

		const { data: existing, error: readError } = await supabase.from("templates").select("id").eq("id", id).maybeSingle();
		if (readError) throw readError;
		if (!existing) return json({ success: false, error: "Template not found." }, { status: 404 });

		const { error } = await supabase.from("templates").delete().eq("id", id);
		if (error) throw error;

		return json({ success: true });
	} catch (error) {
		console.error("[Templates API] DELETE failed:", error);
		return json({ success: false, error: getErrorMessage(error) }, { status: 500 });
	}
};