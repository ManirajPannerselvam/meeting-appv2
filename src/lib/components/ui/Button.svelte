<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Button.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable button component.
	 *
	 * FEATURES
	 *   - Primary
	 *   - Secondary
	 *   - Danger
	 *   - Success
	 *   - Outline
	 *   - Loading
	 *   - Disabled
	 * ============================================================
	 */

	type Variant =
		| 'primary'
		| 'secondary'
		| 'success'
		| 'danger'
		| 'outline';

	type Size =
		| 'sm'
		| 'md'
		| 'lg';

	export let type: 'button' | 'submit' | 'reset' = 'button';

	export let variant: Variant = 'primary';

	export let size: Size = 'md';

	export let loading = false;

	export let disabled = false;

	export let fullWidth = false;

	export let ariaLabel = '';

	$: classes = [
		'btn',
		variant,
		size,
		fullWidth ? 'full' : ''
	].join(' ');
</script>

<button
	type={type}
	class={classes}
	disabled={disabled || loading}
	aria-label={ariaLabel}
>
	{#if loading}
		<span class="spinner"></span>
	{/if}

	<slot />
</button>

<style>
	button {
		border: none;
		cursor: pointer;
		border-radius: 8px;
		font-weight: 600;
		transition: 0.2s;
	}

	.primary {
		background: #2563eb;
		color: white;
	}

	.secondary {
		background: #6b7280;
		color: white;
	}

	.success {
		background: #16a34a;
		color: white;
	}

	.danger {
		background: #dc2626;
		color: white;
	}

	.outline {
		background: transparent;
		border: 1px solid #d1d5db;
	}

	.sm {
		padding: 6px 12px;
		font-size: 0.85rem;
	}

	.md {
		padding: 10px 16px;
		font-size: 1rem;
	}

	.lg {
		padding: 14px 20px;
		font-size: 1.1rem;
	}

	.full {
		width: 100%;
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		margin-right: 8px;
		border: 2px solid rgba(255,255,255,.35);
		border-top-color: white;
		border-radius: 50%;
		animation: spin .7s linear infinite;
		vertical-align: middle;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>