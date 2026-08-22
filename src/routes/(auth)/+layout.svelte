<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/routes/(auth)/+layout.svelte
	 * ============================================================
	 * PURPOSE
	 *   Shared layout for all authentication pages.
	 *
	 * RESPONSIBILITIES
	 *   - Center authentication pages
	 *   - Common branding
	 *   - Shared styling
	 * ============================================================
	 */
</script>

<svelte:head>
	<title>Authentication</title>
</svelte:head>

<div class="auth-layout">
	<div class="auth-container">
		<header class="brand">
			<h1>Temple Operations Reporting System</h1>
			<p>Secure Access Portal</p>
		</header>

		<main>
			<slot />
		</main>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f8fafc;
		font-family: system-ui, sans-serif;
	}

	.auth-layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.auth-container {
		width: 100%;
		max-width: 420px;
	}

	.brand {
		text-align: center;
		margin-bottom: 2rem;
	}

	.brand h1 {
		margin: 0;
		font-size: 1.75rem;
		color: #1f2937;
	}

	.brand p {
		margin-top: 0.5rem;
		color: #6b7280;
		font-size: 0.95rem;
	}
</style>