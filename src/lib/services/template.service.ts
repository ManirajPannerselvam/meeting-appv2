/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/template.service.ts
 * ============================================================
 * PURPOSE
 *   Template business logic with Versioning + Audit
 *   Client-safe: No $lib/server imports
 */

import { supabase } from "$lib/supabase/client";
import { reportsStore } from "$lib/stores/reports";
import { toast } from "$lib/stores/toast";

import type { TemplateRecord, UUID } from "$lib/types/database";
import type { User } from "@supabase/supabase-js";

/* ============================================================
 * HELPER: Audit API
 * ============================================================ */
async function writeAuditLogAPI(
    user: User | null,
    payload: {
        action: 'CREATE' | 'UPDATE' | 'DELETE';
        module: string;
        record_id: UUID;
        description: string;
        new_data?: unknown;
    }
) {
    try {
        await fetch('/api/audit/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user?.id ?? null, ...payload })
        });
    } catch (e) {
        console.error('Audit log failed', e); // don't block main flow
    }
}

type TemplatePayload = Omit<
	TemplateRecord,
	"template_id" | "created_at" | "updated_at" | "dict_version"
> & {
	template_id?: UUID;
	dict_version?: number;
};

class TemplateService {
	private setLoading(value: boolean): void {
		reportsStore.setLoading(value);
	}

	private handleError(error: unknown, msg = "Template error"): never {
		console.error(msg, error);
		toast.error(error instanceof Error ? error.message : String(error));
		throw error instanceof Error ? error : new Error(String(error));
	}

	async loadTemplates(): Promise<TemplateRecord[]> {
		this.setLoading(true);
		try {
			const { data, error } = await supabase
				.from("templates")
				.select("*")
				.order("template_name", { ascending: true })
				.order("dict_version", { ascending: false });

			if (error) throw error;
			const templates = (data ?? []) as TemplateRecord[];
			reportsStore.setTemplates(templates);
			return templates;
		} catch (error) {
			this.handleError(error, "Failed to load templates");
		} finally {
			this.setLoading(false);
	}
	}

	async getTemplate(templateId: UUID): Promise<TemplateRecord | null> {
		const { data, error } = await supabase
			.from("templates")
			.select("*")
			.eq("template_id", templateId)
			.maybeSingle();
		if (error) throw new Error(error.message);
		return data as TemplateRecord | null;
	}

	async loadTemplateByName(templateName: string, version?: number): Promise<TemplateRecord | null> {
		let query = supabase.from("templates").select("*").eq("template_name", templateName);
		if (version !== undefined) {
			query = query.eq("dict_version", version);
		} else {
			query = query.order("dict_version", { ascending: false }).limit(1);
		}
		const { data, error } = await query.maybeSingle();
		if (error) throw new Error(error.message);
		return data as TemplateRecord | null;
	}

	async getTemplateVersions(templateName: string): Promise<TemplateRecord[]> {
		const { data, error } = await supabase
			.from("templates")
			.select("*")
			.eq("template_name", templateName)
			.order("dict_version", { ascending: false });
		if (error) throw new Error(error.message);
		return (data ?? []) as TemplateRecord[];
	}

	private async nameExists(name: string, excludeId?: UUID): Promise<boolean> {
		let query = supabase.from("templates").select("template_id").eq("template_name", name).limit(1);
		if (excludeId) query = query.neq("template_id", excludeId);
		const { data } = await query;
		return (data ?? []).length > 0;
	}

	async saveTemplate(payload: TemplatePayload, user: User | null): Promise<TemplateRecord | null> {
		try {
			const isUpdate = !!payload.template_id;
			if (!isUpdate && await this.nameExists(payload.template_name)) {
				toast.error("Template name already exists");
				return null;
			}

			let recordToSave: Record<string, unknown> = { ...payload };
			let action: "CREATE" | "UPDATE" = "CREATE";

			if (isUpdate) {
				const current = await this.getTemplate(payload.template_id!);
				if (!current) throw new Error("Template not found");

				const contentChanged =
					JSON.stringify(current.station_keys) !== JSON.stringify(payload.station_keys);

				if (contentChanged) {
					action = "CREATE";
					recordToSave = {
						...payload,
						template_id: undefined,
						template_name: payload.template_name,
						dict_version: current.dict_version + 1
					};
					toast.info(`Creating version ${current.dict_version + 1}`);
				} else {
					action = "UPDATE";
					recordToSave = { ...payload, dict_version: current.dict_version };
				}
			} else {
				recordToSave = { ...recordToSave, dict_version: 1 };
			}

			recordToSave.updated_at = new Date().toISOString();

			const { data, error } = await supabase
				.from("templates")
				.upsert(recordToSave)
				.select()
				.single();

			if (error) throw error;
			const savedTemplate = data as TemplateRecord;

			await this.loadTemplates();

			// FIX: Call API instead of server import
			await writeAuditLogAPI(user, {
				action,
				module: "Template",
				record_id: savedTemplate.template_id,
				description: `${action === "CREATE" ? "Created" : "Updated"} template: ${savedTemplate.template_name} v${savedTemplate.dict_version}`,
				new_data: savedTemplate
			});

			toast.success(`Template ${action === "CREATE" ? "saved" : "updated"} v${savedTemplate.dict_version}`);
			return savedTemplate;
	} catch (error) {
			this.handleError(error, "Failed to save template");
	}
	}

	async deleteTemplate(templateId: UUID, user: User | null): Promise<void> {
		try {
			const template = await this.getTemplate(templateId);
			if (!template) throw new Error("Template not found");

			const { error } = await supabase
				.from("templates")
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq("template_id", templateId);

			if (error) throw error;
			await this.loadTemplates();

			await writeAuditLogAPI(user, {
				action: "DELETE",
				module: "Template",
				record_id: templateId,
				description: `Deleted template: ${template.template_name} v${template.dict_version}`
			});

			toast.success("Template deleted");
	} catch (error) {
			this.handleError(error, "Failed to delete template");
	}
	}

	async restoreTemplate(templateId: UUID, user: User | null): Promise<void> {
		const { error } = await supabase
			.from("templates")
			.update({ is_active: true, updated_at: new Date().toISOString() })
			.eq("template_id", templateId);
		if (error) throw error;
		await this.loadTemplates();
		toast.success("Template restored");
	}

	async refresh(): Promise<void> {
		await this.loadTemplates();
	}
}

export const templateService = new TemplateService();
export default templateService;