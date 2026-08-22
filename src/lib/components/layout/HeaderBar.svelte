<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File : src/lib/components/layout/HeaderBar.svelte
	 * ============================================================
	 * PURPOSE
	 *   Application header. Desktop = text nav. Mobile = icons only
	 * ============================================================
	 */

	import { goto } from '$app/navigation';

	export let title = '';
	export let user: any = null;
	export let online = true;
	export let queueCount = 0;
	export let notifications = 0;
	export let chatUnread = 0;

	let userMenuOpen = false;

	const navigation = [
		{ label: 'Dashboard', href: '/dashboard', icon: '🏠' },
		{ label: 'Reports', href: '/reports', icon: '📊' },
		{ label: 'Meetings', href: '/meetings', icon: '📅' },
		{ label: 'Meeting List', href: '/meeting-list', icon: '📋' },
	{ label: 'Chat', href: '/chat', icon: '💬' },
	{ label: 'Users', href: '/users', icon: '👥' },
		{ label: 'Templates', href: '/templates', icon: '📄' },
		{ label: 'Settings', href: '/settings', icon: '⚙️' },
	{ label: 'Admin', href: '/admin', icon: '🛡️' }
	];

	function displayUserName() {
		if (!user) return 'User';
		return user.name ?? user.full_name ?? user.email ?? 'User';
	}

	function navigate(path: string) {
		userMenuOpen = false;
		goto(path);
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	function handleUserMenuKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeUserMenu();
	}
</script>

<svelte:head>
	<title>{title || 'Temple Operations Reporting System'}</title>
</svelte:head>

<header class="app-header">
	<!-- BRAND -->
	<div class="brand">
	<a class="brand-link" href="/dashboard" aria-label="Go to Dashboard" on:click={closeUserMenu}>
			<span class="brand-icon">📊</span>
			<span class="brand-text">ORG</span> <!-- CHANGED: ERP -> ORG -->
	</a>
	</div>

	<!-- DESKTOP NAVIGATION - text + icons -->
	<nav class="main-navigation" aria-label="Main navigation">
	{#each navigation as item}
			<a class="nav-link" href={item.href} on:click={closeUserMenu}>
				<span class="nav-icon">{item.icon}</span>
				<span class="nav-label">{item.label}</span> <!-- hide on mobile via css -->
				{#if item.label === 'Chat' && chatUnread > 0}
					<span class="badge">{chatUnread}</span>
				{/if}
			</a>
	{/each}
	</nav>

	<!-- RIGHT SIDE -->
	<div class="header-right">
	<div class="status">
			<span class={online ? 'online' : 'offline'}>{online ? 'Online' : 'Offline'}</span>
			{#if queueCount > 0}<span>Queue: {queueCount}</span>{/if}
			{#if notifications > 0}<span>Notifs: {notifications}</span>{/if}
	</div>

	<!-- USER MENU -->
		<div class="user-menu" role="presentation" on:keydown={handleUserMenuKeydown}>
			<button
				type="button"
				class="user-button"
				aria-label="Open user menu"
				aria-expanded={userMenuOpen}
				on:click={toggleUserMenu}
			>
				<span class="user-icon">👤</span>
				<span class="user-name">{displayUserName()}</span>
				<span class:user-arrow-open={userMenuOpen} class="user-arrow">▾</span>
			</button>

			{#if userMenuOpen}
				<div class="user-dropdown" role="menu">
					<div class="user-dropdown-header">
						<div class="dropdown-avatar">👤</div>
						<div class="dropdown-user-info">
							<strong>{displayUserName()}</strong>
							{#if user?.email}<span>{user.email}</span>{/if}
						</div>
					</div>
					<div class="dropdown-divider"></div>
					<button type="button" class="dropdown-item" role="menuitem" on:click={() => navigate('/settings')}>
						<span>⚙️</span><span>Settings</span>
					</button>
					<button type="button" class="dropdown-item" role="menuitem" on:click={() => navigate('/users')}>
						<span>👤</span><span>My Profile</span>
					</button>
					<div class="dropdown-divider"></div>
					<button type="button" class="dropdown-item danger-item" role="menuitem" on:click={closeUserMenu}>
						<span>🚪</span><span>Close Menu</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- MOBILE BOTTOM NAV - icons only -->
<nav class="bottom-navigation" aria-label="Mobile navigation">
	{#each navigation.slice(0,5) as item} <!-- only first 5 for bottom bar -->
		<a class="bottom-nav-link" href={item.href} aria-label={item.label} on:click={closeUserMenu}>
			<span class="bottom-icon">{item.icon}</span>
			{#if item.label === 'Chat' && chatUnread > 0}
				<span class="bottom-badge">{chatUnread}</span>
			{/if}
	</a>
	{/each}
</nav>

<style>
	.app-header {
		width: 100%;
		min-height: 64px;
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 10px 18px;
		background: #111827;
		color: white;
		box-sizing: border-box;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.brand { flex-shrink: 0; }
	.brand-link { display: flex; align-items: center; gap: 10px; color: white; text-decoration: none; }
	.brand-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: #1d4ed8; font-size: 18px; }
	.brand-text { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; color: #22c55e; white-space: nowrap; }

	.main-navigation {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.main-navigation::-webkit-scrollbar { display: none; }
	
	.nav-link {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 11px 13px;
		border-radius: 9px;
		color: #f8fafc;
		text-decoration: none;
		font-size: 15px;
		font-weight: 500;
		white-space: nowrap;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.nav-link:hover { background: #1e293b; color: white; }
	.nav-icon { font-size: 15px; }
	.badge { min-width: 19px; height: 19px; display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; border-radius: 999px; background: #ef4444; color: white; font-size: 11px; font-weight: 700; }

	.header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
	.status { display: flex; align-items: center; gap: 10px; color: #cbd5e1; font-size: 12px; white-space: nowrap; }
	.online { color: #22c55e; }
	.offline { color: #ef4444; }

	.user-menu { position: relative; flex-shrink: 0; }
	.user-button { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: none; border-radius: 9px; background: #1e293b; color: white; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s ease; }
	.user-button:hover { background: #334155; }
	.user-name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
	.user-arrow { color: #cbd5e1; font-size: 12px; transition: transform 0.15s ease; }
	.user-arrow-open { transform: rotate(180deg); }
	
	.user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 260px; padding: 8px; background: white; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2); z-index: 1000; }
	.user-dropdown-header { display: flex; align-items: center; gap: 10px; padding: 10px; }
	.dropdown-avatar { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #dbeafe; font-size: 18px; }
	.dropdown-user-info { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.dropdown-user-info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dropdown-user-info span { color: #64748b; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dropdown-divider { height: 1px; margin: 6px 0; background: #e2e8f0; }
	.dropdown-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; border-radius: 8px; background: transparent; color: #334155; font-family: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; }
	.dropdown-item:hover { background: #f1f5f9; color: #1d4ed8; }
	.danger-item:hover { background: #fef2f2; color: #dc2626; }

	/* MOBILE BOTTOM NAV */
	.bottom-navigation { display: none; }

	@media (max-width: 1100px) {
		.app-header { gap: 12px; padding: 10px 12px; }
	.nav-link { padding: 10px; font-size: 14px; }
		.status { display: none; }
		.user-name { max-width: 120px; }
	}

	@media (max-width: 760px) {
	.app-header { min-height: 58px; padding: 9px 12px; }
	.brand-text { font-size: 18px; }
		.nav-label { display: none; } /* desktop nav shows icons only */
		.nav-link { padding: 10px 8px; }
	.header-right { margin-left: auto; }
		.user-name { display: none; }
	.user-button { padding: 9px 10px; }

	/* show bottom bar, hide top mobile nav */
		.bottom-navigation {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			height: 60px;
			background: white;
			border-top: 1px solid #e2e8f0;
			z-index: 99;
			justify-content: space-around;
			align-items: center;
			padding-bottom: env(safe-area-inset-bottom);
		}
		.bottom-nav-link {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			color: #64748b;
			text-decoration: none;
			position: relative;
		}
		.bottom-nav-link:active { background: #f1f5f9; }
		.bottom-icon { font-size: 22px; }
		.bottom-badge { position: absolute; top: 4px; right: calc(50% - 18px); min-width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; border-radius: 999px; background: #ef4444; color: white; font-size: 10px; font-weight: 700; }
	}
</style>