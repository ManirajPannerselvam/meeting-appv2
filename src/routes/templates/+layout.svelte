<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const menus = [
		{
			title: 'Templates',
			href: '/templates',
			icon: '📄'
		},
		{
			title: 'Create',
			href: '/templates/create',
			icon: '➕'
		},
		{
			title: 'Categories',
			href: '/templates/categories',
			icon: '🗂'
		}
	];

	const pathname = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>Template Management</title>
</svelte:head>

<div class="layout">

	<header class="header">
		<div>
			<h1>📄 Template Management</h1>

			<p>
				Create, manage and reuse templates for reports,
				meetings, audits, checklists and AI prompts.
			</p>
		</div>
	</header>

	<nav
		class="tabs"
		aria-label="Template management navigation"
	>
		{#each menus as menu}
			<a
				href={menu.href}
				class:active={pathname === menu.href ||
					(menu.href !== '/templates' &&
						pathname.startsWith(`${menu.href}/`))}
				aria-current={
					pathname === menu.href ||
					(menu.href !== '/templates' &&
						pathname.startsWith(`${menu.href}/`))
						? 'page'
						: undefined
				}
				data-sveltekit-preload-data
			>
				<span
					class="menu-icon"
					aria-hidden="true"
				>
					{menu.icon}
				</span>

				<span>{menu.title}</span>
			</a>
		{/each}
	</nav>

	<div class="content">
		{@render children()}
	</div>

</div>

<style>
	.layout {
		display: flex;
		flex-direction: column;
		gap: 20px;

		width: 100%;
		box-sizing: border-box;

		padding: 24px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		flex-wrap: wrap;
		gap: 16px;
	}

	.header h1 {
		margin: 0;

		color: #0f172a;

		font-size: 32px;
		font-weight: 700;
		line-height: 1.2;
	}

	.header p {
		margin: 8px 0 0;

		color: #64748b;

		font-size: 15px;
		line-height: 1.5;
	}

	.tabs {
		display: flex;
		align-items: center;
		gap: 8px;

		border-bottom: 1px solid #e2e8f0;

		padding-bottom: 12px;

		flex-wrap: wrap;
	}

	.tabs a {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		gap: 8px;

		padding: 10px 16px;

		border-radius: 10px;

		background: transparent;

		color: #475569;

		text-decoration: none;

		font-size: 14px;
		font-weight: 600;

		transition:
			background 0.2s ease,
			color 0.2s ease,
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

	.menu-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		width: 20px;
		height: 20px;

		flex-shrink: 0;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 20px;

		width: 100%;
		min-width: 0;
		min-height: 500px;
	}

	@media (max-width: 768px) {
		.layout {
			gap: 16px;
			padding: 16px;
		}

		.header h1 {
			font-size: 24px;
		}

		.header p {
			font-size: 14px;
		}

		.tabs {
			flex-wrap: nowrap;

			overflow-x: auto;

			padding-bottom: 8px;

			scrollbar-width: none;
		}

		.tabs::-webkit-scrollbar {
			display: none;
		}

		.tabs a {
			flex-shrink: 0;

			padding: 9px 14px;

			font-size: 13px;
		}

		.content {
			min-height: 400px;
		}
	}

	@media (max-width: 480px) {
		.layout {
			padding: 12px;
		}

		.header h1 {
			font-size: 21px;
		}

		.header p {
			font-size: 13px;
		}

		.tabs a {
			padding: 8px 12px;
			font-size: 12px;
		}
	}
</style>