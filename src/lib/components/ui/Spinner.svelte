<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Spinner.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Lightweight reusable spinner component.
	 *
	 * FEATURES
	 *   - Small / Medium / Large
	 *   - Optional label
	 *   - Accessible
	 * ============================================================
	 */

	export let size: 'sm' | 'md' | 'lg' = 'md';

	export let label = 'Loading...';

	$: spinnerClass = `spinner ${size}`;
</script>

<div
	class="spinner-container"
	role="status"
	aria-live="polite"
	aria-label={label}
>
	<div class={spinnerClass}></div>

	{#if label}
		<span>{label}</span>
	{/if}
</div>

<style>
	.spinner-container {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	.spinner {
		border-radius: 50%;
		border-style: solid;
		border-color: #e5e7eb;
		border-top-color: #2563eb;
		animation: spin .8s linear infinite;
	}

	.sm {
		width: 16px;
		height: 16px;
		border-width: 2px;
	}

	.md {
		width: 28px;
		height: 28px;
		border-width: 3px;
	}

	.lg {
		width: 44px;
		height: 44px;
		border-width: 4px;
	}

	span {
		font-size: .9rem;
		color: #4b5563;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>