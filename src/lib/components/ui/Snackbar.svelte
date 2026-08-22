<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Snackbar.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable snackbar/toast notification.
	 *
	 * FEATURES
	 *   - Success
	 *   - Error
	 *   - Warning
	 *   - Info
	 *   - Auto close
	 *   - Manual close
	 * ============================================================
	 */

	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	export let open = false;

	export let message = '';

	export let duration = 3000;

	export let type:
		| 'success'
		| 'error'
		| 'warning'
		| 'info' = 'info';

	let timer: ReturnType<typeof setTimeout>;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	$: if (open) {
		clearTimeout(timer);

		timer = setTimeout(() => {
			close();
		}, duration);
	}

	function close() {
		open = false;
		dispatch('close');
	}
</script>

{#if open}
	<div
		class="snackbar {type}"
		role="status"
		transition:fly={{ y: 24, duration: 200 }}
		out:fade
	>
		<span>{message}</span>

		<button
			type="button"
			on:click={close}
			aria-label="Close notification"
		>
			✕
		</button>
	</div>
{/if}

<style>
	.snackbar {
		position: fixed;
		left: 50%;
		bottom: 24px;
		transform: translateX(-50%);
		min-width: 320px;
		max-width: 600px;
		padding: 14px 18px;
		border-radius: 8px;
		color: white;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		box-shadow: 0 8px 24px rgba(0,0,0,.2);
		z-index: 9999;
	}

	.success {
		background: #16a34a;
	}

	.error {
		background: #dc2626;
	}

	.warning {
		background: #d97706;
	}

	.info {
		background: #2563eb;
	}

	button {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 1rem;
	}

	span {
		flex: 1;
	}
</style>