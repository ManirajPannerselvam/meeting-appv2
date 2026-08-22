# `src/routes/admin/finance/+page.svelte`

```svelte
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { supabase } from "$lib/supabase/client";
    import { toast } from "svelte-sonner";

    type TransactionType = "INCOME" | "EXPENSE";

    interface Transaction {
        transaction_id: string;
        transaction_date: string;
        transaction_type: TransactionType;
        category: string;
        description: string;
        amount: number;
        payment_method: string;
        reference_no: string | null;
        created_by: string | null;
        created_at: string;
        updated_at?: string | null;
        status?: string | null;
    }

    interface MonthlyFinance {
        month: string;
        income: number;
        expense: number;
    }

    interface PaymentSummary {
        method: string;
        count: number;
        amount: number;
    }

    interface CategorySummary {
        category: string;
        income: number;
        expense: number;
    }

    let loading = true;
    let saving = false;

    let transactions: Transaction[] = [];
    let filteredTransactions: Transaction[] = [];

    let search = "";
    let typeFilter: "All" | TransactionType = "All";
    let categoryFilter = "All";

    let selectedYear = new Date().getFullYear();

    let selectedTransaction: Transaction | null = null;
    let showDialog = false;
    let isEditing = false;

    let currentUserId: string | null = null;

    let form: Partial<Transaction> = {
        transaction_id: "",
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "INCOME",
        category: "",
        description: "",
        amount: 0,
        payment_method: "Cash",
        reference_no: "",
        created_by: null,
        created_at: new Date().toISOString(),
        status: "APPROVED"
    };

    // ============================================================
    // PAGINATION
    // ============================================================

    let currentPage = 1;
    let pageSize = 20;

    $: totalPages = Math.max(
        1,
        Math.ceil(filteredTransactions.length / pageSize)
    );

    $: paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // ============================================================
    // DASHBOARD KPIs
    // ============================================================

    $: yearTransactions = transactions.filter(
        (transaction) =>
            new Date(transaction.transaction_date).getFullYear() ===
            selectedYear
    );

    $: totalIncome = yearTransactions
        .filter((transaction) => transaction.transaction_type === "INCOME")
        .reduce(
            (total, transaction) => total + Number(transaction.amount || 0),
            0
        );

    $: totalExpense = yearTransactions
        .filter((transaction) => transaction.transaction_type === "EXPENSE")
        .reduce(
            (total, transaction) => total + Number(transaction.amount || 0),
            0
        );

    $: netBalance = totalIncome - totalExpense;

    $: totalTransactions = yearTransactions.length;

    // ============================================================
    // ANALYTICS
    // ============================================================

    let monthlyFinance: MonthlyFinance[] = [];
    let paymentSummary: PaymentSummary[] = [];
    let categorySummary: CategorySummary[] = [];

    const financeMonths = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];

    // ============================================================
    // AUTH
    // ============================================================

    async function loadCurrentUser(): Promise<void> {
        try {
            const {
                data: { user },
                error
            } = await supabase.auth.getUser();

            if (error) {
                console.error("Failed to load current user:", error);
                currentUserId = null;
                return;
            }

            currentUserId = user?.id ?? null;
        } catch (error) {
            console.error("Failed to load current user:", error);
            currentUserId = null;
        }
    }

    // ============================================================
    // LOAD FINANCE
    // ============================================================

    async function loadFinance(): Promise<void> {
        loading = true;

        try {
            const { data, error } = await supabase
                .from("finance_transactions")
                .select("*")
                .order("transaction_date", {
                    ascending: false
                })
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            transactions = (data ?? []) as Transaction[];

            applyFilters();
            buildAnalytics();
        } catch (error) {
            console.error("Failed to load finance transactions:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load finance transactions"
            );
        } finally {
            loading = false;
        }
    }

    // ============================================================
    // FILTERS
    // ============================================================

    function applyFilters(): void {
        const keyword = search.trim().toLowerCase();

        filteredTransactions = transactions.filter((transaction) => {
            const transactionYear = new Date(
                transaction.transaction_date
            ).getFullYear();

            const description = String(
                transaction.description ?? ""
            ).toLowerCase();

            const category = String(
                transaction.category ?? ""
            ).toLowerCase();

            const matchYear = transactionYear === selectedYear;

            const matchSearch =
                !keyword ||
                description.includes(keyword) ||
                category.includes(keyword) ||
                String(transaction.reference_no ?? "")
                    .toLowerCase()
                    .includes(keyword);

            const matchType =
                typeFilter === "All" ||
                transaction.transaction_type === typeFilter;

            const matchCategory =
                categoryFilter === "All" ||
                transaction.category === categoryFilter;

            return (
                matchYear &&
                matchSearch &&
                matchType &&
                matchCategory
            );
        });

        currentPage = 1;
    }

    $: search;
    $: typeFilter;
    $: categoryFilter;
    $: selectedYear;

    $: {
        search;
        typeFilter;
        categoryFilter;
        selectedYear;

        applyFilters();
    }

    // ============================================================
    // CATEGORY OPTIONS
    // ============================================================

    $: categoryOptions = [
        "All",
        ...Array.from(
            new Set(
                transactions
                    .filter(
                        (transaction) =>
                            new Date(
                                transaction.transaction_date
                            ).getFullYear() === selectedYear
                    )
                    .map((transaction) => transaction.category)
                    .filter(Boolean)
            )
        ).sort()
    ];

    // ============================================================
    // CRUD
    // ============================================================

    function newTransaction(): void {
        isEditing = false;

        form = {
            transaction_date: new Date()
                .toISOString()
                .split("T")[0],

            transaction_type: "INCOME",

            category: "",

            description: "",

            amount: 0,

            payment_method: "Cash",

            reference_no: "",

            created_by: currentUserId,

            status: "APPROVED"
        };

        showDialog = true;
    }

    function editTransaction(transaction: Transaction): void {
        isEditing = true;

        form = {
            transaction_id: transaction.transaction_id,
            transaction_date: transaction.transaction_date,
            transaction_type: transaction.transaction_type,
            category: transaction.category,
            description: transaction.description,
            amount: Number(transaction.amount || 0),
            payment_method: transaction.payment_method,
            reference_no: transaction.reference_no,
            created_by: transaction.created_by,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at,
            status: transaction.status
        };

        showDialog = true;
    }

    function validate(): boolean {
        if (!form.transaction_date) {
            toast.error("Transaction date is required");
            return false;
        }

        if (
            form.transaction_type !== "INCOME" &&
            form.transaction_type !== "EXPENSE"
        ) {
            toast.error("Invalid transaction type");
            return false;
        }

        if (!String(form.description ?? "").trim()) {
            toast.error("Description required");
            return false;
        }

        if (!String(form.category ?? "").trim()) {
            toast.error("Category required");
            return false;
        }

        const amount = Number(form.amount ?? 0);

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Amount must be greater than 0");
            return false;
        }

        if (!String(form.payment_method ?? "").trim()) {
            toast.error("Payment method required");
            return false;
        }

        return true;
    }

    async function saveTransaction(): Promise<void> {
        if (!validate()) {
            return;
        }

        saving = true;

        try {
            if (!currentUserId) {
                await loadCurrentUser();
            }

            const payload = {
                transaction_date: form.transaction_date,
                transaction_type: form.transaction_type,
                category: String(form.category ?? "").trim(),
                description: String(form.description ?? "").trim(),
                amount: Number(form.amount ?? 0),
                payment_method: String(
                    form.payment_method ?? "Cash"
                ).trim(),
                reference_no:
                    String(form.reference_no ?? "").trim() || null,
                status: form.status ?? "APPROVED"
            };

            if (isEditing && form.transaction_id) {
                const { error } = await supabase
                    .from("finance_transactions")
                    .update({
                        ...payload,
                        updated_at: new Date().toISOString()
                    })
                    .eq(
                        "transaction_id",
                        form.transaction_id
                    );

                if (error) {
                    throw error;
                }

                toast.success("Transaction updated");
            } else {
                const { error } = await supabase
                    .from("finance_transactions")
                    .insert({
                        ...payload,
                        created_by: currentUserId
                    });

                if (error) {
                    throw error;
                }

                toast.success("Transaction added");
            }

            showDialog = false;

            await loadFinance();
        } catch (error) {
            console.error("Failed to save transaction:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save transaction"
            );
        } finally {
            saving = false;
        }
    }

    // ============================================================
    // SOFT DELETE / CANCEL
    // ============================================================

    async function deleteTransaction(
        transactionId: string
    ): Promise<void> {
        if (
            !confirm(
                "Cancel this transaction?\n\nThe transaction will remain in the audit history."
            )
        ) {
            return;
        }

        try {
            const { error } = await supabase
                .from("finance_transactions")
                .update({
                    status: "CANCELLED",
                    updated_at: new Date().toISOString()
                })
                .eq(
                    "transaction_id",
                    transactionId
                );

            if (error) {
                throw error;
            }

            toast.success("Transaction cancelled");

            await loadFinance();
        } catch (error) {
            console.error(
                "Failed to cancel transaction:",
                error
            );

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to cancel transaction"
            );
        }
    }

    // ============================================================
    // ANALYTICS
    // ============================================================

    function buildAnalytics(): void {
        const selectedYearTransactions =
            transactions.filter(
                (transaction) =>
                    new Date(
                        transaction.transaction_date
                    ).getFullYear() === selectedYear
            );

        // Monthly
        monthlyFinance = financeMonths.map(
            (month) => ({
                month,
                income: 0,
                expense: 0
            })
        );

        selectedYearTransactions.forEach(
            (transaction) => {
                const monthIndex = new Date(
                    transaction.transaction_date
                ).getMonth();

                const amount = Number(
                    transaction.amount || 0
                );

                if (
                    transaction.transaction_type ===
                    "INCOME"
                ) {
                    monthlyFinance[
                        monthIndex
                    ].income += amount;
                } else if (
                    transaction.transaction_type ===
                    "EXPENSE"
                ) {
                    monthlyFinance[
                        monthIndex
                    ].expense += amount;
                }
            }
        );

        // Payment methods
        const paymentMap =
            new Map<string, PaymentSummary>();

        // Categories
        const categoryMap =
            new Map<string, CategorySummary>();

        selectedYearTransactions.forEach(
            (transaction) => {
                const paymentMethod =
                    transaction.payment_method ||
                    "Unknown";

                if (
                    !paymentMap.has(
                        paymentMethod
                    )
                ) {
                    paymentMap.set(
                        paymentMethod,
                        {
                            method: paymentMethod,
                            count: 0,
                            amount: 0
                        }
                    );
                }

                const payment =
                    paymentMap.get(
                        paymentMethod
                    )!;

                payment.count += 1;

                payment.amount += Number(
                    transaction.amount || 0
                );

                const category =
                    transaction.category ||
                    "Uncategorized";

                if (
                    !categoryMap.has(category)
                ) {
                    categoryMap.set(
                        category,
                        {
                            category,
                            income: 0,
                            expense: 0
                        }
                    );
                }

                const categoryRecord =
                    categoryMap.get(
                        category
                    )!;

                const amount = Number(
                    transaction.amount || 0
                );

                if (
                    transaction.transaction_type ===
                    "INCOME"
                ) {
                    categoryRecord.income +=
                        amount;
                } else {
                    categoryRecord.expense +=
                        amount;
                }
            }
        );

        paymentSummary = [
            ...paymentMap.values()
        ].sort(
            (a, b) =>
                b.amount - a.amount
        );

        categorySummary = [
            ...categoryMap.values()
        ].sort(
            (a, b) =>
                b.income +
                b.expense -
                (a.income + a.expense)
        );
    }

    // ============================================================
    // EXPORT
    // ============================================================

    function escapeCSV(value: unknown): string {
        const text = String(value ?? "");

        return `"${text
            .replace(/"/g, '""')
            .replace(/\r?\n/g, " ")}"`;
    }

    function exportLedger(): void {
        const headers = [
            "Date",
            "Type",
            "Category",
            "Description",
            "Amount",
            "Payment Method",
            "Reference",
            "Status"
        ];

        const rows = filteredTransactions.map(
            (transaction) => [
                transaction.transaction_date,
                transaction.transaction_type,
                transaction.category,
                transaction.description,
                transaction.amount,
                transaction.payment_method,
                transaction.reference_no ?? "",
                transaction.status ?? ""
            ]
        );

        const csv = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) =>
                row.map(escapeCSV).join(",")
            )
        ].join("\n");

        const blob = new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

        const url =
            URL.createObjectURL(blob);

        const anchor =
            document.createElement("a");

        anchor.href = url;

        anchor.download =
            `finance_ledger_${selectedYear}.csv`;

        document.body.appendChild(anchor);

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(url);

        toast.success("Ledger exported");
    }

    function printLedger(): void {
        window.print();
    }

    // ============================================================
    // PAGINATION
    // ============================================================

    function previousPage(): void {
        if (currentPage > 1) {
            currentPage -= 1;
        }
    }

    function nextPage(): void {
        if (currentPage < totalPages) {
            currentPage += 1;
        }
    }

    // ============================================================
    // REFRESH
    // ============================================================

    let financeRefreshTimer:
        ReturnType<typeof setInterval> | undefined;

    onMount(async () => {
        await loadCurrentUser();

        await loadFinance();

        financeRefreshTimer =
            setInterval(
                () => {
                    void loadFinance();
                },
                300000
            );
    });

    onDestroy(() => {
        if (financeRefreshTimer) {
            clearInterval(
                financeRefreshTimer
            );
        }
    });
</script>

<div class="page">

    <!-- ======================================================
         HEADER
    ======================================================= -->

    <div class="page-header">

        <div>
            <h1>💰 Finance Management</h1>
            <p>Income • Expenses • Cash Flow</p>
        </div>

        <div class="header-actions">

            <select
                bind:value={selectedYear}
                class="year-select"
            >
                {#each [2024, 2025, 2026, 2027, 2028, 2029, 2030] as year}
                    <option value={year}>
                        {year}
                    </option>
                {/each}
            </select>

            <button
                class="blue"
                on:click={newTransaction}
            >
                + New Transaction
            </button>

        </div>

    </div>


    <!-- ======================================================
         KPI CARDS
    ======================================================= -->

    <div class="dashboard">

        <div class="card green">
            <h2>
                ₹{totalIncome.toLocaleString()}
            </h2>
            <span>Total Income</span>
        </div>

        <div class="card red">
            <h2>
                ₹{totalExpense.toLocaleString()}
            </h2>
            <span>Total Expense</span>
        </div>

        <div class="card blue">
            <h2>
                ₹{netBalance.toLocaleString()}
            </h2>
            <span>Net Balance</span>
        </div>

        <div class="card purple">
            <h2>{totalTransactions}</h2>
            <span>Transactions</span>
        </div>

    </div>


    <!-- ======================================================
         FILTERS
    ======================================================= -->

    <div class="toolbar">

        <input
            bind:value={search}
            placeholder="Search transaction, category, reference..."
        />

        <select bind:value={typeFilter}>
            <option value="All">
                All Types
            </option>

            <option value="INCOME">
                Income
            </option>

            <option value="EXPENSE">
                Expense
            </option>
        </select>

        <select bind:value={categoryFilter}>
            {#each categoryOptions as category}
                <option value={category}>
                    {category}
                </option>
            {/each}
        </select>

    </div>


    <!-- ======================================================
         TRANSACTIONS
    ======================================================= -->

    <div class="table-card">

        {#if loading}

            <div class="skeleton">

                {#each Array(6) as _}
                    <div class="skeleton-row"></div>
                {/each}

            </div>

        {:else if filteredTransactions.length === 0}

            <div class="loading">
                No transactions found for
                {selectedYear}.
            </div>

        {:else}

            <table>

                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>

                    {#each paginatedTransactions as transaction}

                        <tr
                            class:cancelled-row={
                                transaction.status ===
                                "CANCELLED"
                            }
                        >

                            <td>
                                {new Date(
                                    transaction.transaction_date
                                ).toLocaleDateString()}
                            </td>

                            <td>
                                <strong>
                                    {transaction.description}
                                </strong>

                                {#if transaction.reference_no}
                                    <small class="reference">
                                        Ref:
                                        {transaction.reference_no}
                                    </small>
                                {/if}
                            </td>

                            <td>
                                {transaction.category}
                            </td>

                            <td>

                                <span
                                    class="badge"
                                    class:income={
                                        transaction.transaction_type ===
                                        "INCOME"
                                    }
                                    class:expense={
                                        transaction.transaction_type ===
                                        "EXPENSE"
                                    }
                                >
                                    {transaction.transaction_type ===
                                    "INCOME"
                                        ? "Income"
                                        : "Expense"}
                                </span>

                            </td>

                            <td class="amount-cell">
                                ₹{Number(
                                    transaction.amount || 0
                                ).toLocaleString()}
                            </td>

                            <td>
                                {transaction.payment_method}
                            </td>

                            <td>

                                <span
                                    class="status-badge"
                                    class:approved={
                                        transaction.status ===
                                        "APPROVED"
                                    }
                                    class:cancelled={
                                        transaction.status ===
                                        "CANCELLED"
                                    }
                                >
                                    {transaction.status ??
                                        "APPROVED"}
                                </span>

                            </td>

                            <td>

                                <div class="actions">

                                    {#if transaction.status !== "CANCELLED"}

                                        <button
                                            class="small blue"
                                            on:click={() =>
                                                editTransaction(
                                                    transaction
                                                )}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            class="small red"
                                            on:click={() =>
                                                deleteTransaction(
                                                    transaction.transaction_id
                                                )}
                                        >
                                            Cancel
                                        </button>

                                    {:else}

                                        <span class="muted">
                                            Cancelled
                                        </span>

                                    {/if}

                                </div>

                            </td>

                        </tr>

                    {/each}

                </tbody>

            </table>

        {/if}

    </div>


    <!-- ======================================================
         PAGINATION
    ======================================================= -->

    {#if !loading && filteredTransactions.length > 0}

        <div class="pagination">

            <button
                on:click={previousPage}
                disabled={currentPage === 1}
            >
                ◀ Previous
            </button>

            <span>
                Page {currentPage} of {totalPages}
                • {filteredTransactions.length} records
            </span>

            <button
                on:click={nextPage}
                disabled={currentPage === totalPages}
            >
                Next ▶
            </button>

        </div>

    {/if}


    <!-- ======================================================
         CASH BOOK
    ======================================================= -->

    <div class="table-card">

        <h2>📖 Cash Book — {selectedYear}</h2>

        <table>

            <thead>
                <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expense</th>
                    <th>Balance</th>
                </tr>
            </thead>

            <tbody>

                {#each monthlyFinance as row}

                    <tr>

                        <td>
                            <strong>
                                {row.month}
                            </strong>
                        </td>

                        <td class="income-text">
                            ₹{row.income.toLocaleString()}
                        </td>

                        <td class="expense-text">
                            ₹{row.expense.toLocaleString()}
                        </td>

                        <td
                            class:positive={
                                row.income - row.expense >= 0
                            }
                            class:negative={
                                row.income - row.expense < 0
                            }
                        >
                            ₹{(
                                row.income -
                                row.expense
                            ).toLocaleString()}
                        </td>

                    </tr>

                {/each}

            </tbody>

        </table>

    </div>


    <!-- ======================================================
         MONTHLY CHART
    ======================================================= -->

    <div class="table-card">

        <h2>
            📊 Monthly Financial Report —
            {selectedYear}
        </h2>

        <div class="chart-legend">

            <span>
                <i class="legend-income"></i>
                Income
            </span>

            <span>
                <i class="legend-expense"></i>
                Expense
            </span>

        </div>

        <div class="bar-chart">

            {#each monthlyFinance as row}

                {@const maxVal = Math.max(
                    ...monthlyFinance.map(
                        (month) =>
                            Math.max(
                                month.income,
                                month.expense
                            )
                    ),
                    1
                )}

                <div class="bar-column">

                    <div class="bars">

                        <div
                            class="bar income-bar"
                            style={`height:${Math.max(
                                (row.income / maxVal) * 220,
                                row.income > 0 ? 4 : 0
                            )}px`}
                            title={`Income: ₹${row.income}`}
                        ></div>

                        <div
                            class="bar expense-bar"
                            style={`height:${Math.max(
                                (row.expense / maxVal) * 220,
                                row.expense > 0 ? 4 : 0
                            )}px`}
                            title={`Expense: ₹${row.expense}`}
                        ></div>

                    </div>

                    <span>
                        {row.month}
                    </span>

                </div>

            {/each}

        </div>

    </div>


    <!-- ======================================================
         PAYMENT ANALYSIS
    ======================================================= -->

    <div class="table-card">

        <h2>💳 Payment Method Analysis</h2>

        <table>

            <thead>
                <tr>
                    <th>Method</th>
                    <th>Transactions</th>
                    <th>Total Amount</th>
                </tr>
            </thead>

            <tbody>

                {#if paymentSummary.length === 0}

                    <tr>
                        <td colspan="3" class="empty-cell">
                            No payment data available.
                        </td>
                    </tr>

                {:else}

                    {#each paymentSummary as payment}

                        <tr>

                            <td>
                                {payment.method}
                            </td>

                            <td>
                                {payment.count}
                            </td>

                            <td>
                                ₹{payment.amount.toLocaleString()}
                            </td>

                        </tr>

                    {/each}

                {/if}

            </tbody>

        </table>

    </div>


    <!-- ======================================================
         CATEGORY ANALYSIS
    ======================================================= -->

    <div class="table-card">

        <h2>🏷️ Category Analysis</h2>

        <table>

            <thead>
                <tr>
                    <th>Category</th>
                    <th>Income</th>
                    <th>Expense</th>
                    <th>Net</th>
                </tr>
            </thead>

            <tbody>

                {#if categorySummary.length === 0}

                    <tr>
                        <td colspan="4" class="empty-cell">
                            No category data available.
                        </td>
                    </tr>

                {:else}

                    {#each categorySummary as item}

                        <tr>

                            <td>
                                <strong>
                                    {item.category}
                                </strong>
                            </td>

                            <td class="income-text">
                                ₹{item.income.toLocaleString()}
                            </td>

                            <td class="expense-text">
                                ₹{item.expense.toLocaleString()}
                            </td>

                            <td
                                class:positive={
                                    item.income -
                                        item.expense >=
                                    0
                                }
                                class:negative={
                                    item.income -
                                        item.expense <
                                    0
                                }
                            >
                                ₹{(
                                    item.income -
                                    item.expense
                                ).toLocaleString()}
                            </td>

                        </tr>

                    {/each}

                {/if}

            </tbody>

        </table>

    </div>


    <!-- ======================================================
         BUDGET ALERTS
    ======================================================= -->

    <div class="table-card">

        <h2>🚨 Budget Alerts</h2>

        <div class="alerts">

            {#if totalExpense > totalIncome}

                <div class="alert danger">
                    Expenses exceed total income for
                    {selectedYear}.
                </div>

            {:else}

                <div class="alert success">
                    Financial position is currently
                    positive.
                </div>

            {/if}

            {#if totalIncome > 0 && totalExpense > totalIncome * 0.8}

                <div class="alert warning">
                    Expenses are above 80% of income.
                </div>

            {/if}

            {#if totalIncome === 0 && totalExpense === 0}

                <div class="alert info-alert">
                    No financial transactions are
                    available for {selectedYear}.
                </div>

            {/if}

        </div>

    </div>


    <!-- ======================================================
         REPORTS
    ======================================================= -->

    <div class="table-card">

        <h2>📤 Reports</h2>

        <div class="action-buttons">

            <button
                class="blue"
                on:click={exportLedger}
            >
                Export Ledger
            </button>

            <button
                class="orange"
                on:click={printLedger}
            >
                Print Ledger
            </button>

        </div>

    </div>


    <!-- ======================================================
         FOOTER
    ======================================================= -->

    <footer class="finance-footer">

        <div>
            <strong>Income</strong>
            <span>
                ₹{totalIncome.toLocaleString()}
            </span>
        </div>

        <div>
            <strong>Expense</strong>
            <span>
                ₹{totalExpense.toLocaleString()}
            </span>
        </div>

        <div>
            <strong>Balance</strong>
            <span>
                ₹{netBalance.toLocaleString()}
            </span>
        </div>

        <div>
            <strong>Year</strong>
            <span>
                {selectedYear}
            </span>
        </div>

    </footer>

</div>


<!-- ==========================================================
     TRANSACTION DIALOG
=========================================================== -->

{#if showDialog}

    <div
        class="overlay"
        role="presentation"
        on:click={(event) => {
            if (event.target === event.currentTarget) {
                showDialog = false;
            }
        }}
    >

        <div
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-dialog-title"
        >

            <div class="dialog-header">

                <div>
                    <h2 id="finance-dialog-title">
                        {isEditing
                            ? "Edit Transaction"
                            : "New Transaction"}
                    </h2>

                    <p>
                        Finance transaction for
                        {selectedYear}
                    </p>
                </div>

                <button
                    class="close"
                    aria-label="Close"
                    on:click={() =>
                        (showDialog = false)}
                >
                    ✕
                </button>

            </div>


            <div class="grid">

                <div>
                    <label for="transaction-date">
                        Date
                    </label>

                    <input
                        id="transaction-date"
                        type="date"
                        bind:value={
                            form.transaction_date
                        }
                    />
                </div>


                <div>
                    <label for="transaction-type">
                        Type
                    </label>

                    <select
                        id="transaction-type"
                        bind:value={
                            form.transaction_type
                        }
                    >

                        <option value="INCOME">
                            Income
                        </option>

                        <option value="EXPENSE">
                            Expense
                        </option>

                    </select>
                </div>


                <div>
                    <label for="category">
                        Category
                    </label>

                    <input
                        id="category"
                        placeholder="e.g. Donation, Salary, Purchase"
                        bind:value={form.category}
                    />
                </div>


                <div>
                    <label for="amount">
                        Amount
                    </label>

                    <input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        bind:value={form.amount}
                    />
                </div>


                <div class="full">

                    <label for="description">
                        Description
                    </label>

                    <textarea
                        id="description"
                        rows="4"
                        placeholder="Transaction description"
                        bind:value={form.description}
                    ></textarea>

                </div>


                <div>
                    <label for="payment-method">
                        Payment Method
                    </label>

                    <select
                        id="payment-method"
                        bind:value={
                            form.payment_method
                        }
                    >

                        <option value="Cash">
                            Cash
                        </option>

                        <option value="UPI">
                            UPI
                        </option>

                        <option value="Card">
                            Card
                        </option>

                        <option value="Bank Transfer">
                            Bank Transfer
                        </option>

                        <option value="Cheque">
                            Cheque
                        </option>

                    </select>

                </div>


                <div>
                    <label for="reference-no">
                        Reference No
                    </label>

                    <input
                        id="reference-no"
                        placeholder="Reference / receipt number"
                        bind:value={
                            form.reference_no
                        }
                    />

                </div>

            </div>


            <div class="dialog-footer">

                <button
                    class="secondary"
                    disabled={saving}
                    on:click={() =>
                        (showDialog = false)}
                >
                    Cancel
                </button>

                <button
                    class="green"
                    disabled={saving}
                    on:click={saveTransaction}
                >
                    {saving
                        ? "Saving..."
                        : isEditing
                          ? "Update Transaction"
                          : "Save Transaction"}
                </button>

            </div>

        </div>

    </div>

{/if}


<style>
    .page {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 1400px;
        margin: auto;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }

    .page-header h1 {
        margin: 0;
        color: #0f172a;
        font-size: 28px;
    }

    .page-header p {
        margin: 6px 0 0;
        color: #64748b;
    }

    .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
    }

    .year-select {
        padding: 10px 14px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
    }

    .dashboard {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
    }

    .card {
        padding: 20px;
        border-radius: 12px;
        color: #fff;
        text-align: center;
    }

    .card h2 {
        margin: 0;
        font-size: 30px;
    }

    .card span {
        display: block;
        margin-top: 8px;
        opacity: 0.95;
    }

    .green {
        background: #16a34a;
    }

    .red {
        background: #dc2626;
    }

    .blue {
        background: #2563eb;
    }

    .purple {
        background: #7c3aed;
    }

    .orange {
        background: #ea580c;
    }

    .toolbar {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 12px;
    }

    .toolbar input,
    .toolbar select {
        padding: 11px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #fff;
        min-width: 0;
    }

    .table-card {
        background: #fff;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        overflow-x: auto;
    }

    .table-card h2 {
        margin: 0 0 18px;
        color: #0f172a;
        font-size: 20px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
    }

    th {
        background: #f8fafc;
        padding: 12px;
        text-align: left;
        color: #475569;
        font-size: 13px;
        white-space: nowrap;
    }

    td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        color: #334155;
        vertical-align: middle;
    }

    tbody tr:hover {
        background: #f8fafc;
    }

    .cancelled-row {
        opacity: 0.58;
    }

    .badge {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        display: inline-block;
    }

    .income {
        background: #dcfce7;
        color: #166534;
    }

    .expense {
        background: #fee2e2;
        color: #991b1b;
    }

    .status-badge {
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        display: inline-block;
    }

    .approved {
        background: #dcfce7;
        color: #166534;
    }

    .cancelled {
        background: #e5e7eb;
        color: #475569;
    }

    .amount-cell {
        font-weight: 700;
        white-space: nowrap;
    }

    .reference {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 11px;
    }

    .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .small {
        padding: 6px 11px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        color: white;
        font-size: 12px;
    }

    .small:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .muted {
        color: #94a3b8;
        font-size: 12px;
    }

    .loading {
        padding: 50px;
        text-align: center;
        color: #64748b;
    }

    .empty-cell {
        text-align: center;
        padding: 30px;
        color: #94a3b8;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        margin-top: 2px;
        flex-wrap: wrap;
    }

    .pagination button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: #2563eb;
        color: white;
    }

    .pagination button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .pagination span {
        color: #475569;
        font-size: 13px;
    }

    .bar-chart {
        display: flex;
        align-items: flex-end;
        gap: 14px;
        height: 280px;
        margin-top: 20px;
        overflow-x: auto;
        padding: 10px 5px 0;
    }

    .bar-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        min-width: 60px;
        flex: 1;
        height: 100%;
    }

    .bars {
        height: 230px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 4px;
    }

    .bar {
        width: 18px;
        max-height: 220px;
        border-radius: 5px 5px 0 0;
        transition: height 0.25s ease;
    }

    .income-bar {
        background: #16a34a;
    }

    .expense-bar {
        background: #dc2626;
    }

    .bar-column > span {
        margin-top: 10px;
        font-size: 12px;
        color: #64748b;
    }

    .chart-legend {
        display: flex;
        gap: 20px;
        margin-bottom: 10px;
        color: #64748b;
        font-size: 13px;
    }

    .chart-legend span {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .chart-legend i {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
    }

    .legend-income {
        background: #16a34a;
    }

    .legend-expense {
        background: #dc2626;
    }

    .income-text {
        color: #15803d;
        font-weight: 600;
    }

    .expense-text {
        color: #dc2626;
        font-weight: 600;
    }

    .positive {
        color: #15803d;
        font-weight: 700;
    }

    .negative {
        color: #dc2626;
        font-weight: 700;
    }

    .alerts {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .alert {
        padding: 14px;
        border-radius: 8px;
        font-weight: 600;
    }

    .alert.success {
        background: #dcfce7;
        color: #166534;
    }

    .alert.warning {
        background: #fef3c7;
        color: #92400e;
    }

    .alert.danger {
        background: #fee2e2;
        color: #991b1b;
    }

    .alert.info-alert {
        background: #dbeafe;
        color: #1d4ed8;
    }

    .action-buttons {
        display: flex;
        gap: 12px;
        margin-top: 10px;
        flex-wrap: wrap;
    }

    .skeleton-row {
        height: 48px;
        background: #f1f5f9;
        border-radius: 8px;
        margin-bottom: 12px;
        animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 0.45;
        }

        50% {
            opacity: 1;
        }

        100% {
            opacity: 0.45;
        }
    }

    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
    }

    .dialog {
        background: white;
        padding: 24px;
        border-radius: 14px;
        width: 650px;
        max-width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 20px;
    }

    .dialog-header h2 {
        margin: 0;
        color: #0f172a;
    }

    .dialog-header p {
        margin: 5px 0 0;
        color: #64748b;
        font-size: 13px;
    }

    .close {
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: #64748b;
    }

    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
    }

    .grid input,
    .grid select,
    .grid textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
    }

    .grid textarea {
        resize: vertical;
    }

    .grid label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
    }

    .full {
        grid-column: 1 / -1;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 22px;
    }

    .secondary {
        background: #64748b;
        color: white;
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    }

    .dialog-footer button {
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
    }

    .dialog-footer button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button.blue {
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 8px;
        cursor: pointer;
    }

    button.orange {
        background: #ea580c;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 8px;
        cursor: pointer;
    }

    button.green {
        background: #16a34a;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 8px;
        cursor: pointer;
    }

    button.red {
        background: #dc2626;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 8px;
        cursor: pointer;
    }

    .finance-footer {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        padding: 20px;
        margin-top: 10px;
        border-top: 1px solid #e5e7eb;
        font-size: 13px;
        color: #64748b;
        background: white;
        border-radius: 10px;
    }

    .finance-footer strong {
        display: block;
        color: #111827;
        margin-bottom: 5px;
    }

    .finance-footer span {
        color: #475569;
    }

    @media (max-width: 1100px) {
        .dashboard {
            grid-template-columns: repeat(2, 1fr);
        }

        .finance-footer {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 900px) {
        .page {
            padding: 16px;
        }

        .page-header {
            flex-direction: column;
            align-items: stretch;
        }

        .header-actions {
            width: 100%;
        }

        .header-actions button {
            flex: 1;
        }

        .toolbar {
            grid-template-columns: 1fr;
        }

        .grid {
            grid-template-columns: 1fr;
        }

        .full {
            grid-column: auto;
        }
    }

    @media (max-width: 600px) {
        .dashboard {
            grid-template-columns: 1fr;
        }

        .finance-footer {
            grid-template-columns: 1fr;
            text-align: center;
        }

        .header-actions {
            flex-direction: column;
            align-items: stretch;
        }

        .year-select,
        .header-actions button {
            width: 100%;
        }

        .table-card {
            padding: 14px;
        }

        .pagination {
            flex-direction: column;
        }

        .dialog {
            padding: 18px;
        }
    }

    @media print {
        .header-actions,
        .toolbar,
        .action-buttons,
        .pagination,
        .overlay {
            display: none !important;
        }

        .page {
            max-width: none;
            padding: 0;
        }

        .table-card {
            box-shadow: none;
            break-inside: avoid;
        }
    }
</style>
```
