<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Dialog.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable dialog component.
	 *
	 * FEATURES
	 *   - Modal dialog
	 *   - Header
	 *   - Footer
	 *   - Close button
	 *   - ESC close
	 *   - Overlay click close
	 * ============================================================
	 */

	import { createEventDispatcher } from 'svelte';

	export let open = false;
	export let title = '';
	export let closeOnOverlay = true;
	export let closeOnEscape = true;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	function close() {
		open = false;
		dispatch('close');
	}

	function handleOverlayClick(event: MouseEvent) {
		if (
			closeOnOverlay &&
			event.target === event.currentTarget
		) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (closeOnEscape && event.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="overlay"
		on:click={handleOverlayClick}
		role="presentation"
	>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
		>
			<div class="header">
				<h2 id="dialog-title">{title}</h2>

				<button
					type="button"
					class="close"
					on:click={close}
					aria-label="Close dialog"
				>
					×
				</button>
			</div>

			<div class="body">
				<slot />
			</div>

			{#if $$slots.footer}
				<div class="footer">
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, .45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.dialog {
		width: 100%;
		max-width: 520px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, .2);
		overflow: hidden;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e5e7eb;
	}

	.header h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.close {
		border: none;
		background: transparent;
		font-size: 1.5rem;
		cursor: pointer;
		line-height: 1;
	}

	.body {
		padding: 20px;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid #e5e7eb;
	}
</style>