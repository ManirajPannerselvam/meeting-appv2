<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Loading.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable loading component.
	 *
	 * FEATURES
	 *   - Spinner
	 *   - Optional text
	 *   - Fullscreen mode
	 *   - Overlay mode
	 * ============================================================
	 */

	export let text = 'Loading...';

	export let fullscreen = false;

	export let overlay = false;

	export let size: 'sm' | 'md' | 'lg' = 'md';

	$: spinnerClass = `spinner ${size}`;
</script>

{#if fullscreen}
	<div class="fullscreen">
		<div class="content">
			<div class={spinnerClass}></div>

			{#if text}
				<p>{text}</p>
			{/if}
		</div>
	</div>

{:else if overlay}

	<div class="overlay">
		<div class="content">
			<div class={spinnerClass}></div>

			{#if text}
				<p>{text}</p>
			{/if}
		</div>
	</div>

{:else}

	<div class="inline">
		<div class={spinnerClass}></div>

		{#if text}
			<p>{text}</p>
		{/if}
	</div>

{/if}

<style>
	.fullscreen {
		position: fixed;
		inset: 0;
		background: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.overlay {
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.inline {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.spinner {
		border-radius: 50%;
		border: 3px solid #e5e7eb;
		border-top-color: #2563eb;
		animation: spin 0.8s linear infinite;
	}

	.sm {
		width: 20px;
		height: 20px;
	}

	.md {
		width: 36px;
		height: 36px;
	}

	.lg {
		width: 56px;
		height: 56px;
	}

	p {
		margin: 0;
		font-size: 0.95rem;
		color: #4b5563;
		text-align: center;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>