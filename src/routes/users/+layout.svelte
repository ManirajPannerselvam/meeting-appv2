<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		{ title: 'Users', href: '/users' },
		{ title: 'Create User', href: '/users/create' },
		{ title: 'Import', href: '/users/import' }
	];

	const currentPath = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<div class="users-layout">
	<header class="page-header">
		<div>
			<h1>User Management</h1>
			<p>Manage employees, roles, permissions and departments.</p>
		</div>
	</header>

	<nav
		class="tabs"
		aria-label="User management navigation"
	>
		{#each tabs as tab}
			<a
				href={tab.href}
				class:active={currentPath === tab.href}
				aria-current={currentPath === tab.href ? 'page' : undefined}
				data-sveltekit-preload-data
				on:click
			>
				{tab.title}
			</a>
		{/each}
	</nav>

	<section class="content">
		{@render children()}
	</section>
</div>

<style>
	.users-layout {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
		box-sizing: border-box;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.page-header h1 {
		margin: 0;
		color: #0f172a;
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.page-header p {
		margin: 6px 0 0;
		color: #64748b;
		font-size: 14px;
		line-height: 1.5;
	}

	.tabs {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		border-bottom: 1px solid #e5e7eb;
		padding-bottom: 10px;
	}

	.tabs a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 16px;
		border-radius: 8px;
		color: #475569;
		background: transparent;
		text-decoration: none;
		font-size: 14px;
		font-weight: 600;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.tabs a:hover {
		background: #eff6ff;
		color: #2563eb;
	}

	.tabs a:focus-visible {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	.tabs a.active {
		background: #2563eb;
		color: white;
	}

	.tabs a.active:hover {
		background: #1d4ed8;
		color: white;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.users-layout {
			gap: 16px;
		}

		.page-header h1 {
			font-size: 1.5rem;
		}

		.page-header p {
			font-size: 13px;
		}

		.tabs {
			gap: 6px;
			overflow-x: auto;
			flex-wrap: nowrap;
			padding-bottom: 8px;
			scrollbar-width: none;
		}

		.tabs::-webkit-scrollbar {
			display: none;
		}

		.tabs a {
			flex-shrink: 0;
			padding: 9px 13px;
			font-size: 13px;
		}
	}

	@media (max-width: 480px) {
		.page-header h1 {
			font-size: 1.35rem;
		}

		.tabs a {
			padding: 8px 12px;
			font-size: 12px;
		}
	}
</style>