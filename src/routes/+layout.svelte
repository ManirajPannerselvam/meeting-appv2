<script lang="ts">
	import { goto, afterNavigate } from '$app/navigation';
	import BottomNavigation from '$lib/components/mobile/BottomNavigation.svelte';
	import { supabase } from '$lib/supabase/client';
	import type { User } from '@supabase/supabase-js';
	import '../app.css';

	let { data, children } = $props();

	let openMenu = false;
	let mobileMenu = false;
	let isMobile = false;

	// SWIPE
	let touchStartX = 0;
	let touchEndX = 0;
	const swipeRoutes = ['/dashboard', '/reports', '/meetings', '/chat', '/templates'];
	
	function handleTouchStart(e: TouchEvent) { touchStartX = e.changedTouches[0].screenX; }
	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].screenX;
		const diff = touchStartX - touchEndX;
		const i = swipeRoutes.findIndex(r => currentPath.startsWith(r));
		if (i === -1) return;
		if (diff > 50) goto(swipeRoutes[Math.min(i + 1, swipeRoutes.length - 1)]);
		if (diff < -50) goto(swipeRoutes[Math.max(i - 1, 0)]);
	}

	// CURRENT ROUTE
	let currentPath = '';
	function updateCurrentPath() {
		if (typeof window!== 'undefined') {
			currentPath = window.location.pathname;
			isMobile = window.innerWidth <= 768;
	}
	}
	updateCurrentPath();

	afterNavigate(() => {
		updateCurrentPath();
		openMenu = false;
		mobileMenu = false;
	});

	const user = $derived(data.user as User | null);
	const isChatPage = $derived(currentPath.startsWith('/chat'));
	const isDashboardPage = $derived(currentPath === '/dashboard');

	function toggleMenu() { openMenu =!openMenu; }
	function toggleMobile() { mobileMenu =!mobileMenu; openMenu = false; }
	function closeMobileMenu() { mobileMenu = false; }

	function goSettings() {
		openMenu = false; mobileMenu = false;
		goto('/settings').catch((error) => console.error('[Layout] Settings navigation failed:', error));
	}

	async function logout() {
		try { await supabase.auth.signOut(); }
		catch (error) { console.error('[Layout] Logout failed:', error); }
		finally {
			openMenu = false; mobileMenu = false;
			goto('/login').catch((error) => console.error('[Layout] Login navigation failed:', error));
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (!target.closest('.menu')) openMenu = false;
	}
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') { openMenu = false; mobileMenu = false; }
	}

	function displayUserName(currentUser: User | null) {
		if (!currentUser) return 'User';
		return currentUser.user_metadata?.full_name?? currentUser.user_metadata?.username?? currentUser.email?? 'User';
	}
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} on:resize={updateCurrentPath} />

<!-- FIXED WHITESPACE HERE -->
{#if !isChatPage &&!isDashboardPage &&!isMobile}

	<nav class="navbar" aria-label="Main navigation">
	<div class="left">
			<a href="/dashboard" class="logo" data-sveltekit-preload-data aria-label="ORG Dashboard" on:click={closeMobileMenu}>
				<span class="logo-icon">📊</span>
				<span>ORG</span>
			</a>
	</div>

	<button type="button" class="hamburger" on:click|stopPropagation={toggleMobile} aria-label="Toggle navigation menu" aria-expanded={mobileMenu}>
			☰
	</button>

		<div class="center" class:show={mobileMenu}>
			<a href="/dashboard" data-sveltekit-preload-data on:click={closeMobileMenu}>Dashboard</a>
			<a href="/reports" data-sveltekit-preload-data on:click={closeMobileMenu}>Reports</a>
			<a href="/meetings" data-sveltekit-preload-data on:click={closeMobileMenu}>Meetings</a>
			<a href="/meeting-list" data-sveltekit-preload-data on:click={closeMobileMenu}>Meeting List</a>
			<a href="/chat" data-sveltekit-preload-data on:click={closeMobileMenu}>Chat</a>
			<a href="/users" data-sveltekit-preload-data on:click={closeMobileMenu}>Users</a>
			<a href="/templates" data-sveltekit-preload-data on:click={closeMobileMenu}>Templates</a>
			<a href="/settings" data-sveltekit-preload-data on:click={closeMobileMenu}>Settings</a>
			<a href="/admin" data-sveltekit-preload-data on:click={closeMobileMenu}>Admin</a>
		</div>

		<div class="right">
			{#if user}
				<div class="menu">
					<button type="button" class="user-btn" on:click|stopPropagation={toggleMenu} aria-label="Open user menu" aria-expanded={openMenu}>
						<span>👤</span>
						<span class="user-name">{displayUserName(user)}</span>
						<span class="user-arrow" class:user-arrow-open={openMenu}>▾</span>
					</button>
					{#if openMenu}
						<div class="dropdown" role="menu">
							<div class="dropdown-user">
								<div class="dropdown-avatar">👤</div>
								<div class="dropdown-user-info">
									<strong>{displayUserName(user)}</strong>
									{#if user.email}<span>{user.email}</span>{/if}
								</div>
							</div>
							<div class="dropdown-divider"></div>
							<button type="button" role="menuitem" on:click={goSettings}>⚙️ Settings</button>
							<button type="button" role="menuitem" class="logout" on:click={logout}>🚪 Logout</button>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login" class="login-btn" data-sveltekit-preload-data>Login</a>
			{/if}
		</div>
	</nav>

{/if}

<main class="page-container" class:full-screen={isChatPage} on:touchstart={handleTouchStart} on:touchend={handleTouchEnd}>
	{@render children()}
</main>

<BottomNavigation />

<style>
	/* same css as before */
	:global(body) { margin: 0; font-family: "Segoe UI", sans-serif; background: #f5f7fb; overflow-x: hidden; }
	.page-container { width: 100%; max-width: 1800px; margin: auto; box-sizing: border-box; }
	.navbar { display: flex; justify-content: space-between; align-items: center; width: 100%; min-height: 64px; background: #111827; color: white; padding: 10px 18px; position: sticky; top: 0; z-index: 1000; box-sizing: border-box; gap: 16px; }
	.left { display: flex; align-items: center; flex-shrink: 0; }
	.logo { display: inline-flex; align-items: center; gap: 9px; color: #22c55e; text-decoration: none; font-size: 22px; font-weight: 700; white-space: nowrap; }
	.logo-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: #1d4ed8; font-size: 18px; }
	.center { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
	.center a { display: inline-flex; align-items: center; color: #f8fafc; text-decoration: none; padding: 9px 11px; border-radius: 8px; font-size: 14px; font-weight: 500; white-space: nowrap; }
	.right { display: flex; align-items: center; flex-shrink: 0; }
	.menu { position: relative; }
	.user-btn { display: inline-flex; align-items: center; gap: 8px; background: #1f2937; color: white; border: none; padding: 10px 13px; border-radius: 9px; cursor: pointer; font-size: 14px; font-weight: 600; }
	.dropdown { position: absolute; right: 0; top: calc(100% + 8px); width: 250px; background: white; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; z-index: 1100; }
	.hamburger { display: none; background: transparent; border: none; color: white; font-size: 28px; cursor: pointer; }
	main { padding: 20px; min-height: calc(100vh - 64px); box-sizing: border-box; }
	main.full-screen { padding: 0; min-height: 100dvh; }
	@media (max-width: 900px) {.hamburger { display: block; }.center { display: none; }.center.show { display: flex; flex-direction: column; position: absolute; top: 64px; left: 0; width: 100%; background: #111827; } }
	@media (max-width: 768px) {.navbar { display: none; } main { padding-bottom: 72px; } }
</style>