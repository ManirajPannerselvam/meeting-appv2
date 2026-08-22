/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/types/database.ts
 * ============================================================
 * PURPOSE
 *   Common database types shared across the application.
 *
 * DESCRIPTION
 *   - Template Database
 *   - Daily Reports
 *   - Users
 *   - Meetings
 *   - Notifications
 *   - Finance Transactions
 *   - Shared JSON types
 *   - Common timestamp types
 *
 * NOTE
 *   These are application-level types.
 *   They are NOT generated Supabase database types.
 * ============================================================
 */

/* ============================================================
 * COMMON TYPES
 * ============================================================ */

/**
 * ISO Date
 *
 * Example:
 *   2026-08-04
 */
export type ISODate = string;

/**
 * ISO Timestamp
 *
 * Example:
 *   2026-08-04T14:30:00Z
 */
export type ISOTimestamp = string;

/**
 * UUID
 */
export type UUID = string;

/* ============================================================
 * SHIFT
 * ============================================================ */

/**
 * Shift Type
 */
export type Shift =
	| "Morning"
	| "Evening"
	| "Night";

/* ============================================================
 * JSON
 * ============================================================ */

/**
 * JSON Value
 *
 * Compatible with Supabase JSON / JSONB values.
 */
export type Json =
	| string
	| number
	| boolean
	| null
	| Json[]
	| {
			[key: string]: Json;
	  };

/**
 * Dynamic Station Data
 *
 * Used for JSONB station payloads.
 */
export interface StationData {
	[key: string]: Json;
}

/* ============================================================
 * USER
 * ============================================================ */

/**
 * User Role
 *
 * Keep this aligned with the application's RBAC roles.
 */
export type UserRole =
	| "admin"
	| "manager"
	| "user"
	| "accountant";

/**
 * User Record
 *
 * Application-level representation of the public.users
 * profile table.
 *
 * IMPORTANT
 *   The current application and Supabase users table use:
 *
 *     user_id
 *     full_name
 *     phone
 *
 * Keep these names aligned with the existing services
 * and stores.
 */
export interface UserRecord {
	/**
	 * Primary user/profile identifier.
	 */
	user_id: UUID;

	/**
	 * User's full name.
	 */
	full_name: string;

	/**
	 * User email address.
	 */
	email?: string | null;

	/**
	 * User role used by RBAC.
	 */
	role: UserRole;

	/**
	 * User phone number.
	 */
	phone?: string | null;

	/**
	 * Whether the user is active.
	 */
	is_active?: boolean;

	/**
	 * Profile creation timestamp.
	 */
	created_at?: ISOTimestamp;

	/**
	 * Profile last-update timestamp.
	 */
	updated_at?: ISOTimestamp;
}

/* ============================================================
 * TEMPLATE
 * ============================================================ */

/**
 * Template Record
 *
 * Represents a reporting template stored in the
 * template database/table.
 */
export interface TemplateRecord {
	template_id: UUID;

	template_name: string;

	dict_version: number;

	/**
	 * JSONB station definition.
	 *
	 * Example:
	 *
	 * {
	 *   "station_01": {...},
	 *   "station_02": {...}
	 * }
	 */
	station_keys: StationData;

	/**
	 * Optional complete template payload.
	 *
	 * Some template services use template_data for
	 * change detection and template content handling.
	 */
	template_data?: StationData | Json | null;

	created_at: ISOTimestamp;

	updated_at: ISOTimestamp;
}

/* ============================================================
 * DAILY REPORT
 * ============================================================ */

/**
 * Daily Report Record
 *
 * Represents one user's report for one date, shift,
 * and template.
 */
export interface DailyReportRecord {
	report_date: ISODate;

	shift: Shift;

	template_id: UUID;

	user_id: UUID;

	stations: StationData;

	updated_at: ISOTimestamp;
}

/* ============================================================
 * MEETING
 * ============================================================ */

/**
 * Meeting Type
 */
export type MeetingType =
	| "Daily"
	| "Weekly"
	| "Monthly"
	| "Review"
	| "Planning"
	| "Emergency"
	| "Other"
	| string;

/**
 * Meeting Priority
 */
export type MeetingPriority =
	| "Low"
	| "Medium"
	| "High"
	| "Urgent"
	| string;

/**
 * Meeting Mode
 */
export type MeetingMode =
	| "Offline"
	| "Online"
	| "Hybrid"
	| string;

/**
 * Meeting Status
 */
export type MeetingStatus =
	| "scheduled"
	| "ongoing"
	| "completed"
	| "cancelled"
	| "postponed"
	| string;

/**
 * Meeting Record
 *
 * Application-level representation of a meeting record.
 *
 * Field names intentionally remain snake_case so the type
 * can be used directly with Supabase queries.
 */
export interface MeetingRecord {
	id?: UUID;

	title: string;

	type?: MeetingType | null;

	department?: string | null;

	priority?: MeetingPriority | null;

	meeting_date: ISODate;

	start_time: string;

	end_time?: string | null;

	location?: string | null;

	organizer?: string | null;

	participants?: string[] | Json | null;

	agenda?: string | null;

	meeting_objective?: string | null;

	reference_no?: string | null;

	meeting_mode?: MeetingMode | null;

	meeting_link?: string | null;

	reminder_minutes?: number | null;

	attachment?: string | null;

	created_by?: UUID | null;

	status?: MeetingStatus | null;

	created_at?: ISOTimestamp;

	updated_at?: ISOTimestamp;

	/**
	 * Allows additional meeting columns without forcing
	 * every database column into the shared application type.
	 */
	[key: string]: Json | undefined;
}

/* ============================================================
 * NOTIFICATION
 * ============================================================ */

/**
 * Notification Type
 */
export type NotificationType =
	| "INFO"
	| "SUCCESS"
	| "WARNING"
	| "ERROR"
	| "MEETING"
	| "REPORT"
	| "FINANCE"
	| "SYSTEM"
	| string;

/**
 * Notification Record
 *
 * Application-level representation of a notification.
 *
 * Optional fields are intentional because notification
 * records may differ slightly between existing tables and
 * realtime payloads.
 */
export interface NotificationRecord {
	id?: UUID;

	notification_id?: UUID;

	user_id: UUID;

	title?: string | null;

	message?: string | null;

	content?: string | null;

	type?: NotificationType | null;

	is_read?: boolean;

	read_at?: ISOTimestamp | null;

	related_id?: UUID | null;

	related_type?: string | null;

	created_at?: ISOTimestamp;

	updated_at?: ISOTimestamp;

	/**
	 * Allows additional notification columns without forcing
	 * every database column into the shared application type.
	 */
	[key: string]: Json | undefined;
}

/* ============================================================
 * FINANCE
 * ============================================================ */

/**
 * Finance Transaction Type
 */
export type FinanceTransactionType =
	| "INCOME"
	| "EXPENSE";

/**
 * Finance Transaction Status
 *
 * Optional because existing finance records may not
 * contain a status field.
 */
export type FinanceTransactionStatus =
	| "PENDING"
	| "APPROVED"
	| "CANCELLED"
	| "REJECTED";

/**
 * Finance Transaction
 *
 * Shared application-level representation of a finance
 * transaction.
 *
 * Database column names remain snake_case so this type
 * can be used directly with Supabase queries.
 */
export interface FinanceTransaction {
	transaction_id: UUID;

	transaction_type: FinanceTransactionType;

	amount: number;

	category?: string | null;

	description?: string | null;

	transaction_date?: ISODate | null;

	status?: FinanceTransactionStatus | string | null;

	created_by?: UUID | null;

	created_at?: ISOTimestamp;

	updated_at?: ISOTimestamp;

	/**
	 * Allows additional finance fields without forcing
	 * every database column into the shared application type.
	 */
	[key: string]: Json | undefined;
}

/* ============================================================
 * DATABASE RESPONSE
 * ============================================================ */

/**
 * Standard Database Response
 *
 * Common application-level response wrapper.
 */
export interface DatabaseResponse<T> {
	success: boolean;

	data: T | null;

	error: string | null;
}