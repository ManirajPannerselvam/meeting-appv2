<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Modal.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable modal component.
	 *
	 * FEATURES
	 *   - Backdrop
	 *   - Header
	 *   - Body
	 *   - Footer
	 *   - ESC close
	 *   - Backdrop click close
	 *   - Fade animation
	 * ============================================================
	 */

	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let open = false;
	export let title = '';
	export let width = '600px';
	export let persistent = false;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	function close() {
		if (persistent) return;

		open = false;
		dispatch('close');
	}

	function onBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

{#if open}
	<div
		class="backdrop"
		on:click={onBackdrop}
		transition:fade
	>
		<div
			class="modal"
			style={`max-width:${width}`}
			role="dialog"
			aria-modal="true"
			transition:scale={{ duration: 150 }}
		>
			<header class="header">
				<h2>{title}</h2>

				{#if !persistent}
					<button
						class="close"
						type="button"
						on:click={close}
						aria-label="Close"
					>
						✕
					</button>
				{/if}
			</header>

			<section class="body">
				<slot />
			</section>

			{#if $$slots.footer}
				<footer class="footer">
					<slot name="footer" />
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, .45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		z-index: 1000;
	}

	.modal {
		width: 100%;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 20px 50px rgba(0, 0, 0, .2);
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
		cursor: pointer;
		font-size: 1.25rem;
	}

	.body {
		padding: 20px;
		max-height: 70vh;
		overflow: auto;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid #e5e7eb;
	}
</style>