/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/stores/finance.ts
 * ============================================================
 * PURPOSE
 * Central reactive finance state for transactions, loading,
 * errors, filters and financial summary.
 *
 * IMPORTANT
 * This store MUST NOT statically import financeService.
 *
 * finance.service.ts imports financeStore, so a static import
 * in the opposite direction creates a circular dependency:
 *
 * finance.service.ts
 * ↓
 * stores/finance.ts
 * ↓
 * finance.service.ts
 *
 * Service imports are therefore lazy-loaded inside store
 * methods that need them.
 * ============================================================
 */

import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";

import { toast } from "$lib/stores/toast";

import type {
	FinanceTransaction,
	FinanceTransactionType,
	ISODate
} from "$lib/types/database";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface FinanceFilters {
	from?: ISODate;
	to?: ISODate;
	type?: FinanceTransactionType;
	category?: string;
}

export interface FinanceSummary {
	totalIncome: number;
	totalExpense: number;
	balance: number;
	transactions: number;
}

export interface FinanceState {
	transactions: FinanceTransaction[];
	selectedTransaction: FinanceTransaction | null;
	summary: FinanceSummary;
	loading: boolean;
	error: string | null;
	filters: FinanceFilters;
}

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialSummary: FinanceSummary = {
	totalIncome: 0,
	totalExpense: 0,
	balance: 0,
	transactions: 0
};

const initialState: FinanceState = {
	transactions: [],
	selectedTransaction: null,
	summary: { ...initialSummary },
	loading: false,
	error: null,
	filters: {}
};

/* ============================================================
 * STORE FACTORY
 * ============================================================ */

function createFinanceStore() {
	const { subscribe, update, set } = writable<FinanceState>(initialState);

	return {
	subscribe,

		/* ======================================================
		 * STATE
		 * ====================================================== */

		setState(state: FinanceState): void {
			set(state);
	},

		getState(): FinanceState {
			let current!: FinanceState;
			const unsubscribe = subscribe((value) => { current = value; });
			unsubscribe();
			return current;
		},

		reset(): void {
			set({ ...initialState, summary: { ...initialSummary }, filters: {} });
	},

	/* ======================================================
		 * LOADING / ERROR
		 * ====================================================== */

		setLoading(loading: boolean): void {
			update(state => ({ ...state, loading }));
	},

		setError(error: string | null): void {
			update(state => ({ ...state, error }));
	},

		clearError(): void {
			update(state => ({ ...state, error: null }));
		},

		/* ======================================================
		 * TRANSACTIONS
		 * ====================================================== */

		setTransactions(transactions: FinanceTransaction[]): void {
			update(state => ({ ...state, transactions, error: null }));
		},

		addTransaction(transaction: FinanceTransaction): void {
			update(state => ({ ...state, transactions: [transaction, ...state.transactions] }));
		},

		updateTransaction(transaction: FinanceTransaction): void {
			update(state => ({
				...state,
				transactions: state.transactions.map(item =>
					item.transaction_id === transaction.transaction_id ? transaction : item
				),
				selectedTransaction: state.selectedTransaction?.transaction_id === transaction.transaction_id
					? transaction
					: state.selectedTransaction
			}));
		},

		removeTransaction(transactionId: string): void {
			update(state => ({
				...state,
				transactions: state.transactions.filter(item => item.transaction_id !== transactionId),
				selectedTransaction: state.selectedTransaction?.transaction_id === transactionId
					? null
					: state.selectedTransaction
			}));
	},

		/* ======================================================
		 * SELECTED TRANSACTION
		 * ====================================================== */

		setSelectedTransaction(transaction: FinanceTransaction | null): void {
			update(state => ({ ...state, selectedTransaction: transaction }));
	},

		clearSelectedTransaction(): void {
			update(state => ({ ...state, selectedTransaction: null }));
		},

		/* ======================================================
		 * SUMMARY
		 * ====================================================== */

		setSummary(summary: FinanceSummary): void {
			update(state => ({
				...state,
				summary: {
					totalIncome: Number(summary.totalIncome ?? 0),
					totalExpense: Number(summary.totalExpense ?? 0),
					balance: Number(summary.balance ?? 0),
					transactions: Number(summary.transactions ?? 0)
				}
			}));
		},

		/**
		 * Recalculate summary from current transactions
		 * Called by realtime when DB changes
		 */
		recalculateSummary(): void {
			update(state => {
				const income = state.transactions
					.filter(t => t.transaction_type === 'INCOME')
					.reduce((sum, t) => sum + Number(t.amount), 0);

				const expense = state.transactions
					.filter(t => t.transaction_type === 'EXPENSE')
					.reduce((sum, t) => sum + Number(t.amount), 0);

				return {
					...state,
					summary: {
						totalIncome: income,
						totalExpense: expense,
						balance: income - expense,
						transactions: state.transactions.length
					}
				};
			});
		},

		/* ======================================================
		 * FILTERS
		 * ====================================================== */

		setFilters(filters: FinanceFilters): void {
			update(state => ({ ...state, filters }));
		},

		clearFilters(): void {
			update(state => ({ ...state, filters: {} }));
		},

		/* ======================================================
		 * LOAD TRANSACTIONS
		 * ====================================================== */

		async loadTransactions(filters?: FinanceFilters): Promise<void> {
			this.setLoading(true);
			this.setError(null);
			try {
				const activeFilters = filters ?? this.getState().filters;
				this.setFilters(activeFilters);
				const { financeService } = await import("$lib/services/finance.service");
				await financeService.loadTransactions(activeFilters);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.setError(message);
			} finally {
				this.setLoading(false);
			}
		},

		/* ======================================================
		 * LOAD INCOME
		 * ====================================================== */

		async loadIncome(filters?: Omit<FinanceFilters, "type">): Promise<void> {
			this.setLoading(true);
			this.setError(null);
			try {
				const { financeService } = await import("$lib/services/finance.service");
				await financeService.loadIncome(filters);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.setError(message);
			} finally {
				this.setLoading(false);
			}
		},

		/* ======================================================
		 * LOAD EXPENSES
		 * ====================================================== */

		async loadExpenses(filters?: Omit<FinanceFilters, "type">): Promise<void> {
			this.setLoading(true);
			this.setError(null);
			try {
				const { financeService } = await import("$lib/services/finance.service");
				await financeService.loadExpenses(filters);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.setError(message);
			} finally {
				this.setLoading(false);
			}
		},

		/* ======================================================
		 * LOAD CASH BOOK
		 * ====================================================== */

		async loadCashBook(date: ISODate): Promise<void> {
			this.setLoading(true);
			this.setError(null);
			try {
				const { financeService } = await import("$lib/services/finance.service");
				await financeService.loadCashBook(date);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.setError(message);
			} finally {
				this.setLoading(false);
			}
	},

	/* ======================================================
		 * LOAD SUMMARY
		 * ====================================================== */

		async loadSummary(filters?: { from?: ISODate; to?: ISODate }): Promise<void> {
			this.setLoading(true);
			this.setError(null);
			try {
				const { financeService } = await import("$lib/services/finance.service");
				await financeService.loadSummary(filters);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.setError(message);
			} finally {
				this.setLoading(false);
			}
	},

		/* ======================================================
		 * REFRESH
		 * ====================================================== */

		async refresh(): Promise<void> {
			this.setLoading(true);
			this.setError(null);
			try {
				const { financeService } = await import("$lib/services/finance.service");
				await financeService.refresh();
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.setError(message);
				if (browser) {
					toast.error("Failed to refresh finance data");
				}
			} finally {
				this.setLoading(false);
			}
		},

		/* ======================================================
		 * CLEAR
		 * ====================================================== */

		clear(): void {
			set({ ...initialState, summary: { ...initialSummary }, filters: {} });
		}
	};
}

/* ============================================================
 * EXPORT STORE
 * IMPORTANT: finance.service.ts imports this exact named export.
 * ============================================================ */

export const financeStore = createFinanceStore();

/* ============================================================
 * DERIVED STORES
 * ============================================================ */

export const financeTransactions = derived(financeStore, $finance => $finance.transactions);
export const financeSummary = derived(financeStore, $finance => $finance.summary);
export const financeLoading = derived(financeStore, $finance => $finance.loading);
export const financeError = derived(financeStore, $finance => $finance.error);
export const selectedFinanceTransaction = derived(financeStore, $finance => $finance.selectedTransaction);

/* ============================================================
 * INCOME
 * ============================================================ */

export const incomeTransactions = derived(
	financeStore,
	$finance => $finance.transactions.filter(transaction => transaction.transaction_type === "INCOME")
);

/* ============================================================
 * EXPENSES
 * ============================================================ */

export const expenseTransactions = derived(
	financeStore,
	$finance => $finance.transactions.filter(transaction => transaction.transaction_type === "EXPENSE")
);

/* ============================================================
 * APPROVED TRANSACTIONS
 * ============================================================ */

export const approvedFinanceTransactions = derived(
	financeStore,
	$finance => $finance.transactions.filter(transaction => transaction.status === "APPROVED")
);

/* ============================================================
 * CANCELLED TRANSACTIONS
 * ============================================================ */

export const cancelledFinanceTransactions = derived(
	financeStore,
	$finance => $finance.transactions.filter(transaction => transaction.status === "CANCELLED")
);

/* ============================================================
 * CATEGORY FILTER
 * ============================================================ */

export const financeCategories = derived(financeStore, $finance => {
	const categories = $finance.transactions
		.map(transaction => transaction.category)
		.filter((category): category is string => typeof category === "string" && category.trim().length > 0);
	return [...new Set(categories)].sort();
});

/* ============================================================
 * TOTALS
 * ============================================================ */

export const totalIncome = derived(financeStore, $finance => $finance.summary.totalIncome);
export const totalExpense = derived(financeStore, $finance => $finance.summary.totalExpense);
export const financeBalance = derived(financeStore, $finance => $finance.summary.balance);
export const financeTransactionCount = derived(financeStore, $finance => $finance.summary.transactions);