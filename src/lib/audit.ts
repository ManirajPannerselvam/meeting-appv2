// src/lib/audit.ts

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuditAction =
	| "LOGIN"
	| "LOGOUT"
	| "CREATE"
	| "UPDATE"
	| "DELETE"
	| "EXPORT"
	| "PRINT"
	| "BACKUP"
	| "RESTORE"
	| "APPROVE"
	| "REJECT"
	| "ASSIGN";

export interface AuditLog {
	action: AuditAction;
	module: string;
	record_id?: string;
	description?: string;
	old_data?: unknown;
	new_data?: unknown;
	ip_address?: string;
	user_agent?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Write an application audit log.
 *
 * This helper is intentionally UI-independent.
 * Do not import toast libraries here because this module
 * can be used by both client and SSR code.
 */
export async function writeAuditLog(
	supabase: SupabaseClient,
	user: User | null,
	log: AuditLog
): Promise<boolean> {
	try {
		const { error } = await supabase
			.from("audit_logs")
			.insert({
				user_id: user?.id ?? null,
				action: log.action,
				module: log.module,
				record_id: log.record_id ?? null,
				description: log.description ?? null,
				old_data: log.old_data ?? null,
				new_data: log.new_data ?? null,
				ip_address: log.ip_address ?? null,
				user_agent: log.user_agent ?? null,
				created_at: new Date().toISOString()
			});

		if (error) {
			console.error("Audit log insert failed:", error);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Audit log error:", error);
		return false;
	}
}

/**
 * Returns browser-side information that can safely be collected
 * from the client.
 *
 * IP address must be obtained server-side.
 */
export function getClientInfo(): Pick<
	AuditLog,
	"ip_address" | "user_agent"
> {
	return {
		user_agent:
			typeof navigator !== "undefined"
				? navigator.userAgent
				: undefined,
		ip_address: undefined
	};
}