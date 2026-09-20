<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import type { NavigationItem } from '$lib/components/layout/Sidebar.svelte';
	import { page } from '$app/stores';
	import { authService } from '$lib/services/auth.service';
	import { onMount } from 'svelte';

	let username = $state('User');
	let currentPath = $state('/dashboard');

	onMount(async () => {
		try {
			const u = await authService.getCurrentUser();
			if (u?.email) username = u.email.split('@')[0];
		} catch {}
	});

	// Subscribe to page store correctly in Svelte 5
	$effect(() => {
		const unsub = page.subscribe((p) => {
			currentPath = p.url.pathname;
		});
		return unsub;
	});

	const navigation: NavigationItem[] = [
		{ id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/dashboard' },
		{ id: 'reports', label: 'Reports', icon: '📊', href: '/reports' },
		{ id: 'chat', label: 'Chat', icon: '💬', href: '/chat' },
		{ id: 'meetings', label: 'Meetings', icon: '📅', href: '/meetings' },
		{ id: 'users', label: 'Users', icon: '👥', href: '/users' },
		{ id: 'templates', label: 'Templates', icon: '📄', href: '/templates' },
		{ id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
		{ id: 'admin', label: 'Admin', icon: '🛡️', href: '/admin' }
	];

	let activeId = $derived(currentPath.split('/')[1] || 'dashboard');

	let { children } = $props();
</script>

<AppShell
	title="Temple Operations Reporting System"
	subtitle="Dashboard"
	username={username}
	active={activeId}
	{navigation}
>
	{@render children()}

	{#snippet sidebarFooter()}
		<Footer application="Temple Operations Reporting System" version="1.0.0" />
	{/snippet}
</AppShell>