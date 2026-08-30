<script lang="ts">
	let { children } = $props();
</script>

<svelte:head><title>Template Management</title></svelte:head>

<div class="layout">
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.layout {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 100vw;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		min-height: 100vh;
		background: #f8fafc;
		overflow-x: hidden;
	}
	.content {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		min-height: 100vh;
		box-sizing: border-box;
	}

	/* DESKTOP - center content, max width */
	@media (min-width: 769px) {
		.layout {
			align-items: center;
		}
		.content {
			width: 100%;
			max-width: 1200px;
		}
	}

	/* MOBILE - full width, no extra padding, safe area */
	@media (max-width: 768px) {
		.layout {
			padding: 0;
			padding-bottom: env(safe-area-inset-bottom);
		}
		.content {
			padding: 0;
		}
	}
</style>