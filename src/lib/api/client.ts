/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/api/client.ts
 * ============================================================
 * PURPOSE
 * Central Supabase API helper for CRUD and bulk operations.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { toast } from "$lib/stores/toast";

/* ============================================================
 * TYPES
 * ============================================================ */

type FilterOperator =
	| 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
	| 'like' | 'ilike' | 'is' | 'in' | 'contains'
	| 'containedBy' | 'rangeGt' | 'rangeGte'
	| 'rangeLt' | 'rangeLte' | 'rangeAdjacent';

export interface QueryOptions {
	select?: string;
	orderBy?: string;
	ascending?: boolean;
	limit?: number;
	range?: [number, number];
	filters?: {
		column: string;
		operator: FilterOperator;
		value: any;
	}[];
}

/* ============================================================
 * API CLIENT
 * ============================================================ */

export class ApiClient {
	/* ==========================================================
	 * GET ALL
	 * ========================================================== */

	static async getAll<T = any>(
		table: string,
		options: QueryOptions = {}
	): Promise<T[]> {
		try {
			let query = supabase.from(table).select(options.select?? "*");

			/* Filters */
			options.filters?.forEach((filter) => {
				const op = filter.operator;
				// @ts-ignore - Supabase dynamic operator
				query = query[op](filter.column, filter.value);
			});

			/* Ordering */
			if (options.orderBy) {
				query = query.order(options.orderBy, { ascending: options.ascending?? false });
			}

			/* Pagination */
			if (options.range) {
				query = query.range(options.range[0], options.range[1]);
			} else if (typeof options.limit === "number") {
				query = query.limit(options.limit);
			}

			const { data, error } = await query;

			if (error) throw error;
			return (data?? []) as T[];
		} catch (error: unknown) {
			console.error(`GetAll ${table} Error:`, error);
			const message = error instanceof Error? error.message : String(error);
			toast.error(message);
			return [];
		}
	}

	/* ==========================================================
	 * GET BY ID
	 * ========================================================== */

	static async getById<T = any>(
		table: string,
		idField: string,
		id: string | number
	): Promise<T | null> {
		try {
			const { data, error } = await supabase
				.from(table)
				.select("*")
				.eq(idField, id)
				.single();

			if (error) throw error;
			return data as T;
	} catch (error: unknown) {
			console.error(`GetById ${table} Error:`, error);
			const message = error instanceof Error? error.message : String(error);
			toast.error(message);
			return null;
		}
	}

	/* ==========================================================
	 * INSERT
	 * ========================================================== */

	static async insert<T = any, P extends Record<string, any> = Record<string, any>>(
		table: string,
		payload: P,
		showToast = true
	): Promise<T | null> {
		try {
			const { data, error } = await supabase
				.from(table)
				.insert(payload as any) // FIX: cast to any to satisfy RejectExcessProperties
				.select()
				.single();

			if (error) throw error;

			if (showToast) toast.success("Saved successfully");
			return data as T;
		} catch (error: unknown) {
			console.error(`Insert ${table} Error:`, error);
			const message = error instanceof Error? error.message : String(error);
			if (showToast) toast.error(message);
			return null;
		}
	}

	/* ==========================================================
	 * UPDATE
	 * ========================================================== */

	static async update<T = any, P extends Record<string, any> = Record<string, any>>(
		table: string,
		idField: string,
		id: string | number,
		payload: P,
		showToast = true
	): Promise<T | null> {
		try {
			const { data, error } = await supabase
				.from(table)
				.update(payload as any) // FIX: cast to any
				.eq(idField, id)
				.select()
				.single();

			if (error) throw error;

			if (showToast) toast.success("Updated successfully");
			return data as T;
	} catch (error: unknown) {
			console.error(`Update ${table} Error:`, error);
			const message = error instanceof Error? error.message : String(error);
			if (showToast) toast.error(message);
			return null;
	}
	}

	/* ==========================================================
	 * REMOVE
	 * ========================================================== */

	static async remove(
		table: string,
		idField: string,
		id: string | number,
		showToast = true
	): Promise<boolean> {
		try {
			const { error } = await supabase
				.from(table)
				.delete()
				.eq(idField, id);

			if (error) throw error;

			if (showToast) toast.success("Deleted successfully");
			return true;
		} catch (error: unknown) {
			console.error(`Delete ${table} Error:`, error);
			const message = error instanceof Error? error.message : String(error);
			if (showToast) toast.error(message);
			return false;
		}
	}

	/* ==========================================================
	 * BULK INSERT
	 * ========================================================== */

	static async bulkInsert<T = any, P extends Record<string, any> = Record<string, any>>(
		table: string,
		payload: P[],
		showToast = true
	): Promise<T[] | null> {
		try {
			const { data, error } = await supabase
				.from(table)
				.insert(payload as any) // FIX: cast to any
				.select();

			if (error) throw error;

			if (showToast) toast.success(`${payload.length} records saved`);
			return (data?? []) as T[];
		} catch (error: unknown) {
			console.error(`BulkInsert ${table} Error:`, error);
			const message = error instanceof Error? error.message : String(error);
			if (showToast) toast.error(message);
			return null;
	}
	}}