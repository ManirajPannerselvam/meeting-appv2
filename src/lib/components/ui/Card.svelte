<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Card.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable Card component.
	 *
	 * FEATURES
	 *   - Header
	 *   - Body
	 *   - Footer
	 *   - Shadow
	 *   - Hover
	 * ============================================================
	 */

	export let title = '';

	export let bordered = true;

	export let hover = false;

	export let padding = true;

	$: classes = [
		'card',
		bordered ? 'bordered' : '',
		hover ? 'hover' : '',
		padding ? 'padding' : ''
	].join(' ');
</script>

<div class={classes}>

	{#if title}
		<div class="header">
			<h3>{title}</h3>
		</div>
	{/if}

	<div class="body">
		<slot />
	</div>

	{#if $$slots.footer}
		<div class="footer">
			<slot name="footer" />
		</div>
	{/if}

</div>

<style>
	.card {
		background: white;
		border-radius: 12px;
		overflow: hidden;
		transition: 0.2s;
	}

	.bordered {
		border: 1px solid #e5e7eb;
	}

	.padding {
		padding: 16px;
	}

	.hover:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
	}

	.header {
		margin-bottom: 16px;
	}

	.header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #111827;
	}

	.body {
		display: block;
	}

	.footer {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}
</style>