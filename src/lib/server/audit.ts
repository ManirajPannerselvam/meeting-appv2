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
}

export async function writeAuditLog(
	supabase: SupabaseClient,
	user: User | null,
	log: AuditLog,
	_showToast = false
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
			throw error;
		}

		return true;
	} catch (err) {
		console.error("Audit Log Error:", err);
		return false;
	}
}

// Helper for client-side usage.
// IP address must be determined server-side.
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