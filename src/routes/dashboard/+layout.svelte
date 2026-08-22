<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/routes/dashboard/+layout.svelte
	 * ============================================================
	 * PURPOSE
	 *   Shared layout for all dashboard pages.
	 *
	 * RESPONSIBILITIES
	 *   - Uses AppShell
	 *   - Provides navigation
	 *   - Hosts authenticated pages
	 * ============================================================
	 */

	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import type { NavigationItem } from '$lib/components/layout/Sidebar.svelte';

	const navigation: NavigationItem[] = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			icon: '🏠',
			href: '/dashboard'
		},
		{
			id: 'reports',
			label: 'Reports',
			icon: '📊',
			href: '/reports'
		},
		{
			id: 'chat',
			label: 'Chat',
			icon: '💬',
			href: '/chat'
		},
		{
			id: 'meetings',
			label: 'Meetings',
			icon: '📅',
			href: '/meetings'
		},
		{
			id: 'users',
			label: 'Users',
			icon: '👥',
			href: '/users'
		},
		{
			id: 'templates',
			label: 'Templates',
			icon: '📄',
			href: '/templates'
		},
		{
			id: 'settings',
			label: 'Settings',
			icon: '⚙️',
			href: '/settings'
		},
		{
			id: 'admin',
			label: 'Admin',
			icon: '🛡️',
			href: '/admin'
		}
	];
</script>

<AppShell
	title="Temple Operations Reporting System"
	subtitle="Dashboard"
	username="User"
	active="dashboard"
	{navigation}
>

	<slot />

	<div slot="sidebar-footer">
		<Footer
			application="Temple Operations Reporting System"
			version="1.0.0"
		/>
	</div>

</AppShell>