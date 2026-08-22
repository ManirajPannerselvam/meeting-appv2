import {
	writable,
	derived,
	get
} from "svelte/store";

import type {
	FinanceTransaction,
	ISODate
} from "$lib/types/database";

export interface FinanceSummary {
	totalIncome: number;
	totalExpense: number;
	balance: number;
}

export interface FinanceState {
	transactions: FinanceTransaction[];
	currentTransaction: FinanceTransaction | null;
	selectedTransaction: FinanceTransaction | null;
	summary: FinanceSummary;
	loading: boolean;
	error: string | null;
	filterDate: ISODate | null;
}

const initialState: FinanceState = {
	transactions: [],
	currentTransaction: null,
	selectedTransaction: null,
	summary: {
		totalIncome: 0,
		totalExpense: 0,
		balance: 0
	},
	loading: false,
	error: null,
	filterDate: null
};

function createFinanceStore() {
	const { subscribe, set, update } = writable<FinanceState>(initialState);

	const calculateSummary = (transactions: FinanceTransaction[]): FinanceSummary => {
		const totalIncome = transactions
			.filter(t => t.transaction_type === "INCOME")
			.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

		const totalExpense = transactions
			.filter(t => t.transaction_type === "EXPENSE")
			.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

		return {
			totalIncome,
			totalExpense,
			balance: totalIncome - totalExpense
	};
	};

	const store = {
	subscribe,

		setState(state: FinanceState): void {
			set(state);
	},

		getState(): FinanceState {
			return get({ subscribe });
	},

		reset(): void {
			set(initialState);
	},

		setLoading(loading: boolean): void {
			update(state => ({ ...state, loading }));
	},

		setError(error: string | null): void {
			update(state => ({ ...state, error }));
	},

		setTransactions(transactions: FinanceTransaction[]): void {
			update(state => ({
				...state,
				transactions,
				summary: calculateSummary(transactions) // auto recalc
			}));
		},

		setCurrentTransaction(transaction: FinanceTransaction | null): void {
			update(state => ({ ...state, currentTransaction: transaction }));
		},

		setSelectedTransaction(transaction: FinanceTransaction | null): void {
			update(state => ({ ...state, selectedTransaction: transaction }));
		},

		setSummary(summary: FinanceSummary): void {
			update(state => ({ ...state, summary }));
		},

		addTransaction(transaction: FinanceTransaction): void {
			update(state => {
				const transactions = [transaction, ...state.transactions];
				return {
					...state,
					transactions,
					summary: calculateSummary(transactions) // auto recalc
				};
			});
		},

		updateTransaction(transaction: FinanceTransaction): void {
			update(state => {
				const transactions = state.transactions.map(item =>
					item.transaction_id === transaction.transaction_id ? transaction : item
				);
				return {
					...state,
					transactions,
					summary: calculateSummary(transactions) // auto recalc
				};
			});
		},

		removeTransaction(transactionId: string): void {
			update(state => {
				const transactions = state.transactions.filter(
					item => item.transaction_id !== transactionId
				);
				return {
					...state,
					transactions,
					summary: calculateSummary(transactions) // auto recalc
				};
			});
	},

		setFilterDate(date: ISODate | null): void {
			update(state => ({ ...state, filterDate: date }));
		},

		clearCurrentTransaction(): void {
			store.setCurrentTransaction(null); // fixed
	},

		clearSelectedTransaction(): void {
			store.setSelectedTransaction(null); // fixed
	},

		clearTransactions(): void {
			set(initialState); // reset everything including summary
		},

		recalculateSummary(): void {
			const { transactions } = store.getState(); // fixed
			store.setSummary(calculateSummary(transactions)); // fixed
		},
	};

	return store; // <-- added
}

export const financeStore = createFinanceStore();

export const incomeTransactions = derived(
	financeStore,
	($finance) => $finance.transactions.filter(t => t.transaction_type === "INCOME")
);

export const expenseTransactions = derived(
	financeStore,
	($finance) => $finance.transactions.filter(t => t.transaction_type === "EXPENSE")
);

export const currentBalance = derived(
	financeStore,
	($finance) => $finance.summary.balance
);

export const transactionCount = derived(
	financeStore,
	($finance) => $finance.transactions.length
);