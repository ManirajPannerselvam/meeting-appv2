<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/layout/Navigation.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable application navigation.
	 *
	 * FEATURES
	 *   - Horizontal / Vertical layouts
	 *   - Active item highlighting
	 *   - Badge support
	 *   - Icons
	 *   - Navigation events
	 * ============================================================
	 */

	import { createEventDispatcher } from 'svelte';

	export interface NavigationItem {
		id: string;
		label: string;
		href?: string;
		icon?: string;
		badge?: number;
		disabled?: boolean;
	}

	export let items: NavigationItem[] = [];

	export let active = '';

	export let vertical = false;

	const dispatch = createEventDispatcher<{
		select: NavigationItem;
	}>();

	function select(item: NavigationItem) {
		if (item.disabled) return;

		dispatch('select', item);
	}
</script>

<nav
	class:vertical
	aria-label="Application navigation"
>

	{#each items as item}

		<button
			type="button"
			class:selected={active === item.id}
			disabled={item.disabled}
			on:click={() => select(item)}
		>

			{#if item.icon}
				<span class="icon">
					{item.icon}
				</span>
			{/if}

			<span class="label">
				{item.label}
			</span>

			{#if item.badge !== undefined && item.badge > 0}
				<span class="badge">
					{item.badge}
				</span>
			{/if}

		</button>

	{/each}

</nav>

<style>
	nav {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	nav.vertical {
		flex-direction: column;
		align-items: stretch;
	}

	button {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: none;
		background: transparent;
		border-radius: 8px;
		cursor: pointer;
		font-size: .95rem;
		transition: .2s;
	}

	button:hover:not(:disabled) {
		background: #f3f4f6;
	}

	button.selected {
		background: #2563eb;
		color: white;
		font-weight: 600;
	}

	button:disabled {
		opacity: .5;
		cursor: not-allowed;
	}

	.icon {
		width: 22px;
		text-align: center;
	}

	.label {
		flex: 1;
		text-align: left;
	}

	.badge {
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: 999px;
		background: #dc2626;
		color: white;
		font-size: .75rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>