/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/types/report.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Report-related application types.
 *
 * DESCRIPTION
 *   Used by:
 *   - Report Builder
 *   - Daily Reports
 *   - Offline Queue
 *   - Dashboard
 *   - Analytics
 *
 * NOTE
 *   Database model:
 *   templates
 *   daily_reports
 * ============================================================
 */

import type {
	UUID,
	ISODate,
	ISOTimestamp,
	Shift,
	Json
} from './database';

/**
 * Dynamic report field value
 */
export type ReportValue = Json;

/**
 * One station's values
 */
export interface ReportStation {
	station_id: string;
	values: Record<string, ReportValue>;
}

/**
 * Daily report payload
 */
export interface ReportPayload {
	report_date: ISODate;
	shift: Shift;
	template_id: UUID;
	user_id: UUID;
	stations: Record<string, Record<string, ReportValue>>;
}

/**
 * Report Draft
 */
export interface ReportDraft extends ReportPayload {
	isDraft: boolean;
	lastSavedAt: ISOTimestamp;
}

/**
 * Queue item for offline sync
 */
export interface ReportQueueItem {
	id: UUID;
	action: 'INSERT' | 'UPDATE' | 'DELETE';
	payload: ReportPayload;
	createdAt: ISOTimestamp;
	retryCount: number;
}

/**
 * Report filter
 */
export interface ReportFilter {
	report_date?: ISODate;
	shift?: Shift;
	template_id?: UUID;
	user_id?: UUID;
}

/**
 * Report summary
 */
export interface ReportSummary {
	totalReports: number;
	totalTemplates: number;
	totalStations: number;
	lastUpdated: ISOTimestamp | null;
}