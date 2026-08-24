<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/layout/AppHeader.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Application header.
	 *
	 * FEATURES
	 *   - Logo
	 *   - Page title
	 *   - User avatar
	 *   - Notifications slot
	 *   - Actions slot
	 *   - Mobile menu button
	 * ============================================================
	 */

	import { createEventDispatcher } from 'svelte';

	export let title = 'Temple Operations';

	export let subtitle = '';

	export let username = '';

	export let avatar = '';

	export let showMenu = true;

	const dispatch = createEventDispatcher<{
		menu: void;
		profile: void;
	}>();

	function openMenu() {
		dispatch('menu');
	}

	function openProfile() {
		dispatch('profile');
	}
</script>

<header class="header">

	<div class="left">

		{#if showMenu}
			<button
				type="button"
				class="menu"
				on:click={openMenu}
				aria-label="Open menu"
			>
				☰
			</button>
		{/if}

		<div class="titles">

			<h1>{title}</h1>

			{#if subtitle}
				<p>{subtitle}</p>
			{/if}

		</div>

	</div>

	<div class="right">

		<slot name="notifications" />

		<slot name="actions" />

		<button
			type="button"
			class="profile"
			on:click={openProfile}
			aria-label="Profile"
		>

			{#if avatar}

				<img
					src={avatar}
					alt={username}
				/>

			{:else}

				<div class="initial">
					{username ? username.charAt(0).toUpperCase() : '?'}
				</div>

			{/if}

		</button>

	</div>

</header>

<style>
	.header {
		height: 64px;
		padding: 0 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.menu,
	.profile {
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.menu {
		font-size: 1.3rem;
	}

	.titles h1 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
	}

	.titles p {
		margin: 2px 0 0;
		font-size: .85rem;
		color: #6b7280;
	}

	.profile img,
	.initial {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		background: #2563eb;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
	}
</style>