<script lang="ts">
	import { page } from '$app/stores';
	const tabs = [
	{ path: '/dashboard', icon: '🏠' },
		{ path: '/reports', icon: '📊' },
	{ path: '/meetings', icon: '📅' },
		{ path: '/chat', icon: '💬' },
	{ path: '/templates', icon: '📄' }
	];
	$: current = $page.url.pathname;
</script>

<nav class="bottom-nav">
	{#each tabs as tab}
		<a href={tab.path} class:active={current.startsWith(tab.path)}>
			<span>{tab.icon}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		display: none;
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
	}
	@media (max-width: 768px) {.bottom-nav { display: flex; } }
	a { flex: 1; text-align: center; font-size: 22px; color: #64748b; text-decoration: none; padding: 10px 0; }
	a.active { color: #2563eb; }
</style>