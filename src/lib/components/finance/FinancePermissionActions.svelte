<script lang="ts">
	import { canCreateFinance, canDeleteFinance } from "$lib/utils/permissions";

	export let data: {
		user?: unknown;
	} | null = null;

	export let id: string = "";

	$: user = data?.user ?? null;

	function newTransaction(): void {
		console.log("New finance transaction");
	}

	function deleteTransaction(transactionId: string): void {
		console.log("Delete transaction:", transactionId);
	}
</script>

{#if canCreateFinance(user)}
	<button
		type="button"
		class="blue"
		onclick={newTransaction}
	>
		+ New Transaction
	</button>
{/if}

{#if canDeleteFinance(user) && id}
	<button
		type="button"
		class="small red"
		onclick={() => deleteTransaction(id)}
	>
		Delete
	</button>
{/if}

