/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/finance.service.ts
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { financeStore } from "$lib/stores/finance";
import { toast } from "$lib/stores/toast";

import type {
	FinanceTransaction,
	UUID,
	ISODate
} from "$lib/types/database";

import type { User } from "@supabase/supabase-js";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface FinanceFilters {
	from?: ISODate;
	to?: ISODate;
	type?: "INCOME" | "EXPENSE";
	category?: string;
}

export interface FinanceTransactionPayload {
	transaction_id?: UUID;
	voucher_no?: string;
	transaction_date: ISODate;
	transaction_type: "INCOME" | "EXPENSE";
	amount: number;
	category?: string | null;
	description?: string | null;
	payment_method?: string | null;
	reference_no?: string | null;
	status?: string;
	created_by?: UUID | null;
	updated_at?: string;
}

export interface FinanceSummary {
	totalIncome: number;
	totalExpense: number;
	balance: number;
	transactions: number;
}

/* ============================================================
 * SERVICE
 * ============================================================ */

class FinanceService {

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) return error.message;
		return String(error);
	}

	private handleError(error: unknown, message: string): never {
		console.error(`[FinanceService] ${message}`, error);
		const errorMessage = this.getErrorMessage(error);
		financeStore.setError(errorMessage);
		toast.error(errorMessage);
		throw error instanceof Error ? error : new Error(errorMessage);
	}

	private generateVoucherNo(transactionType: "INCOME" | "EXPENSE"): string {
		const prefix = transactionType === "INCOME" ? "INC" : "EXP";
		const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
		const random = Math.floor(100000 + Math.random() * 900000);
		return `${prefix}-${date}-${random}`;
	}

	async loadTransactions(filters?: FinanceFilters): Promise<FinanceTransaction[]> {
		try {
			let query = supabase.from("finance_transactions").select("*").order("transaction_date", { ascending: false });
			if (filters?.from) query = query.gte("transaction_date", filters.from);
			if (filters?.to) query = query.lte("transaction_date", filters.to);
			if (filters?.type) query = query.eq("transaction_type", filters.type);
			if (filters?.category) query = query.eq("category", filters.category);
			const { data, error } = await query;
			if (error) throw error;
			const transactions = (data ?? []) as FinanceTransaction[];
			financeStore.setTransactions(transactions);
			return transactions;
		} catch (error) {
			this.handleError(error, "Failed to load finance transactions");
		}
	}

	async getTransaction(transactionId: UUID): Promise<FinanceTransaction | null> {
		try {
			const { data, error } = await supabase.from("finance_transactions").select("*").eq("transaction_id", transactionId).maybeSingle();
			if (error) throw error;
			return data as FinanceTransaction | null;
		} catch (error) {
			this.handleError(error, "Failed to load finance transaction");
		}
	}

	async loadIncome(filters?: Omit<FinanceFilters, "type">): Promise<FinanceTransaction[]> {
		return this.loadTransactions({ ...filters, type: "INCOME" });
	}

	async loadExpenses(filters?: Omit<FinanceFilters, "type">): Promise<FinanceTransaction[]> {
		return this.loadTransactions({ ...filters, type: "EXPENSE" });
	}

	async loadCashBook(date: ISODate): Promise<FinanceTransaction[]> {
		return this.loadTransactions({ from: date, to: date });
	}

	async createTransaction(payload: FinanceTransactionPayload, user: User | null): Promise<FinanceTransaction | null> {
		try {
			if (!payload.transaction_date || !payload.transaction_type || !payload.amount) {
				toast.error("Transaction date, type and amount are required");
				return null;
			}

			const voucherNo = payload.voucher_no || this.generateVoucherNo(payload.transaction_type);

			const insertPayload = {
				...payload,
				voucher_no: voucherNo,
				amount: Number(payload.amount),
				status: payload.status ?? "PENDING",
				created_by: user?.id ?? null,
				updated_at: new Date().toISOString()
			};

			const { data, error } = await supabase.from("finance_transactions").insert(insertPayload).select("*").single();
			if (error) throw error;

			const transaction = data as FinanceTransaction;
			await this.loadTransactions();

			try {
				const { writeAuditLog } = await import("$lib/audit");
				// FIX: 3 args -> supabase, user, log
				await writeAuditLog(
					supabase,
					user,
					{
						action: "CREATE",
						module: "Finance",
						record_id: transaction.transaction_id,
						description: `Created ${transaction.transaction_type}: ${transaction.voucher_no}`,
						new_data: transaction,
					}
				);
			} catch (auditError) {
				console.warn("[FinanceService] Audit logging failed:", auditError);
			}

			toast.success("Finance transaction created");
			return transaction;
	} catch (error) {
			this.handleError(error, "Failed to create finance transaction");
		}
	}

	async updateTransaction(transactionId: UUID, payload: Partial<FinanceTransactionPayload>, user: User | null): Promise<FinanceTransaction | null> {
		try {
			const updatePayload = {
				...payload,
				amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
				updated_at: new Date().toISOString()
			};

			const { data, error } = await supabase.from("finance_transactions").update(updatePayload).eq("transaction_id", transactionId).select("*").single();
			if (error) throw error;

			const transaction = data as FinanceTransaction;
			await this.loadTransactions();

			try {
				const { writeAuditLog } = await import("$lib/audit");
				// FIX: 3 args -> supabase, user, log
				await writeAuditLog(
					supabase,
					user,
					{
						action: "UPDATE",
						module: "Finance",
						record_id: transactionId,
						description: `Updated transaction: ${transaction.voucher_no}`,
						new_data: transaction,
					}
				);
			} catch (auditError) {
				console.warn("[FinanceService] Audit logging failed:", auditError);
			}

			toast.success("Finance transaction updated");
			return transaction;
	} catch (error) {
			this.handleError(error, "Failed to update finance transaction");
	}
	}

	async deleteTransaction(transactionId: UUID, user: User | null): Promise<void> {
		try {
			const { data: transaction } = await supabase.from("finance_transactions").select("transaction_id,voucher_no").eq("transaction_id", transactionId).maybeSingle();

			const { error } = await supabase.from("finance_transactions").update({
				status: "CANCELLED",
				updated_at: new Date().toISOString()
			}).eq("transaction_id", transactionId);

			if (error) throw error;
			await this.loadTransactions();

			try {
				const { writeAuditLog } = await import("$lib/audit");
				// FIX: 3 args -> supabase, user, log
				await writeAuditLog(
					supabase,
					user,
					{
						action: "DELETE",
						module: "Finance",
						record_id: transactionId,
						description: `Cancelled transaction: ${transaction?.voucher_no ?? transactionId}`,
					}
				);
			} catch (auditError) {
				console.warn("[FinanceService] Audit logging failed:", auditError);
			}

			toast.success("Finance transaction cancelled");
		} catch (error) {
			this.handleError(error, "Failed to cancel finance transaction");
	}
	}

	async loadSummary(filters?: { from?: ISODate; to?: ISODate }): Promise<FinanceSummary> {
		try {
			let query = supabase.from("finance_transactions").select("amount, transaction_type").eq("status", "APPROVED");
			if (filters?.from) query = query.gte("transaction_date", filters.from);
			if (filters?.to) query = query.lte("transaction_date", filters.to);
			const { data, error } = await query;
			if (error) throw error;

			let totalIncome = 0;
			let totalExpense = 0;

			for (const row of data ?? []) {
				const amount = Number(row.amount ?? 0);
				if (row.transaction_type === "INCOME") totalIncome += amount;
				else if (row.transaction_type === "EXPENSE") totalExpense += amount;
			}

			const summary: FinanceSummary = {
				totalIncome,
				totalExpense,
				balance: totalIncome - totalExpense,
				transactions: (data ?? []).length
			};

			financeStore.setSummary(summary);
			return summary;
		} catch (error) {
			this.handleError(error, "Failed to load finance summary");
	}
	}

	async refresh(): Promise<void> {
		try {
			financeStore.setLoading(true);
			financeStore.clearError();
			const [transactions, summary] = await Promise.all([this.loadTransactions(), this.loadSummary()]);
			financeStore.setTransactions(transactions);
			financeStore.setSummary(summary);
		} catch (error) {
			this.handleError(error, "Failed to refresh finance data");
	} finally {
			financeStore.setLoading(false);
		}
	}

	async exportCSV(filters?: FinanceFilters): Promise<string> {
		try {
			const transactions = await this.loadTransactions(filters);
			const headers = ["Voucher No","Date","Type","Amount","Category","Description","Payment Method","Reference No","Status"];
			const escapeCSV = (value: unknown): string => {
				const text = String(value ?? "");
				return `"${text.replace(/"/g, '""')}"`;
			};
			const rows = transactions.map(transaction => [
				transaction.voucher_no,
				transaction.transaction_date,
				transaction.transaction_type,
				transaction.amount,
				transaction.category,
				transaction.description,
				transaction.payment_method,
				transaction.reference_no,
				(transaction as FinanceTransaction & { status?: string }).status
			].map(escapeCSV).join(","));
			return [headers.map(escapeCSV).join(","), ...rows].join("\n");
		} catch (error) {
			this.handleError(error, "Failed to export finance CSV");
		}
	}
}

export const financeService = new FinanceService();
export default financeService;