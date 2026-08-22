<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/layout/Sidebar.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Application sidebar navigation.
	 *
	 * FEATURES
	 *   - Responsive sidebar
	 *   - Navigation menu
	 *   - Active item
	 *   - Collapsible
	 *   - Mobile overlay
	 * ============================================================
	 */

	import { createEventDispatcher } from 'svelte';

	export interface NavigationItem {
		id: string;
		label: string;
		icon?: string;
		href: string;
	}

	export let open = true;

	export let title = 'Temple Operations';

	export let items: NavigationItem[] = [];

	export let active = '';

	const dispatch = createEventDispatcher<{
		close: void;
		navigate: { item: NavigationItem };
	}>();

	function closeSidebar() {
		open = false;
		dispatch('close');
	}

	function navigate(item: NavigationItem) {
		dispatch('navigate', { item });
	}
</script>

{#if open}

	<div
		class="overlay"
		role="presentation"
		on:click={closeSidebar}
	>

		<aside
			class="sidebar"
			role="navigation"
			aria-label="Main navigation"
			on:click|stopPropagation
		>

			<header class="header">

				<h2>{title}</h2>

				<button
					type="button"
					class="close"
					on:click={closeSidebar}
					aria-label="Close sidebar"
				>
					✕
				</button>

			</header>

			<nav>

				{#each items as item}

					<button
						type="button"
						class:selected={active === item.id}
						on:click={() => navigate(item)}
					>

						{#if item.icon}
							<span class="icon">
								{item.icon}
							</span>
						{/if}

						<span>
							{item.label}
						</span>

					</button>

				{/each}

			</nav>

			<footer>
				<slot name="footer" />
			</footer>

		</aside>

	</div>

{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,.35);
		z-index: 999;
	}

	.sidebar {
		width: 280px;
		max-width: 85vw;
		height: 100%;
		background: white;
		display: flex;
		flex-direction: column;
		box-shadow: 2px 0 12px rgba(0,0,0,.1);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px;
		border-bottom: 1px solid #e5e7eb;
	}

	.header h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.close {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
	}

	nav {
		flex: 1;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	nav button {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border: none;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		text-align: left;
		font-size: .95rem;
		transition: background .2s;
	}

	nav button:hover {
		background: #f3f4f6;
	}

	nav button.selected {
		background: #2563eb;
		color: white;
		font-weight: 600;
	}

	.icon {
		width: 24px;
		text-align: center;
	}

	footer {
		padding: 16px;
		border-top: 1px solid #e5e7eb;
	}
</style>