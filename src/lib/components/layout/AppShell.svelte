<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/layout/AppShell.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Main application shell.
	 *
	 * RESPONSIBILITIES
	 *   - Header
	 *   - Sidebar
	 *   - Main Content
	 *   - Responsive layout
	 *   - Mobile sidebar toggle
	 * ============================================================
	 */

	import AppHeader from './AppHeader.svelte';
	import Sidebar, { type NavigationItem } from './Sidebar.svelte';

	export let title = 'Temple Operations';
	export let subtitle = '';

	export let username = '';
	export let avatar = '';

	export let navigation: NavigationItem[] = [];
	export let active = '';

	let sidebarOpen = true;

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<div class="app-shell">

	<AppHeader
		{title}
		{subtitle}
		{username}
		{avatar}
		on:menu={toggleSidebar}
	>
		<slot name="header-actions" slot="actions" />
		<slot
			name="header-notifications"
			slot="notifications"
		/>
	</AppHeader>

	<div class="layout">

		<Sidebar
			open={sidebarOpen}
			items={navigation}
			{active}
			on:close={closeSidebar}
		>
			<slot
				name="sidebar-footer"
				slot="footer"
			/>
		</Sidebar>

		<main>

			<slot />

		</main>

	</div>

</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: #f8fafc;
	}

	.layout {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	main {
		flex: 1;
		padding: 24px;
		overflow: auto;
	}

	@media (max-width: 768px) {
		main {
			padding: 16px;
		}
	}
</style>