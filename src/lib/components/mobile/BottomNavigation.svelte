<script lang="ts">
	import { page } from '$app/stores';
	
	// FIX 10 - Only 4 items: dashboard, report, chat, meeting list
	const tabs = [
		{ path: '/dashboard', label: 'Dashboard', icon: '🏠' },
		{ path: '/reports', label: 'Report', icon: '📊' },
		{ path: '/chat', label: 'Chat', icon: '💬' },
		{ path: '/meetings', label: 'Meeting', icon: '📅' }
	];
	
	$: current = $page.url.pathname;
</script>

<nav class="bottom-nav">
	{#each tabs as tab}
		<a href={tab.path} class="tab" class:active={current.startsWith(tab.path)}>
			<span class="icon">{tab.icon}</span>
			<span class="label">{tab.label}</span>
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
		height: 64px;
		background: #111827;
		border-top: 1px solid #1f2937;
		z-index: 99;
		justify-content: space-around;
		align-items: center;
		padding: 0 8px;
		padding-bottom: env(safe-area-inset-bottom);
	}
	
	@media (max-width: 768px) {
		.bottom-nav { display: flex; }
	}
	
	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		text-align: center;
		font-size: 20px;
		color: #6b7280;
		text-decoration: none;
		padding: 6px 0;
		border-radius: 12px;
		transition: all 0.2s;
	}
	
	.icon { font-size: 22px; line-height: 1; }
	.label { font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
	
	.tab.active { 
		color: #22c55e; 
		background: #1f2937;
	}
	
	.tab:active {
		transform: scale(0.95);
	}
</style>